#!/bin/bash

# PyTake Server Setup Script
# Run this script on a fresh Ubuntu/Debian server to prepare it for PyTake deployment

set -e

echo "🔧 PyTake Development Server Setup"
echo "==================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root (use sudo)"
    exit 1
fi

# Update system
log_info "Updating system packages..."
apt-get update && apt-get upgrade -y

# Install essential packages
log_info "Installing essential packages..."
apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    htop \
    vim \
    ufw \
    fail2ban \
    certbot \
    ca-certificates \
    gnupg \
    lsb-release

# Install Docker
log_info "Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Install Docker Compose (standalone)
log_info "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create non-root user for deployment
read -p "Enter username for deployment (default: pytake): " DEPLOY_USER
DEPLOY_USER=${DEPLOY_USER:-pytake}

if ! id "$DEPLOY_USER" &>/dev/null; then
    log_info "Creating user $DEPLOY_USER..."
    useradd -m -s /bin/bash $DEPLOY_USER
    usermod -aG docker $DEPLOY_USER
    usermod -aG sudo $DEPLOY_USER
    
    # Set up SSH key authentication
    log_info "Setting up SSH key for $DEPLOY_USER..."
    sudo -u $DEPLOY_USER mkdir -p /home/$DEPLOY_USER/.ssh
    chmod 700 /home/$DEPLOY_USER/.ssh
    
    echo "Please paste your public SSH key (or press Enter to skip):"
    read -r SSH_KEY
    if [ ! -z "$SSH_KEY" ]; then
        echo "$SSH_KEY" | sudo -u $DEPLOY_USER tee /home/$DEPLOY_USER/.ssh/authorized_keys
        chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys
        chown $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh/authorized_keys
    fi
else
    log_info "User $DEPLOY_USER already exists"
    usermod -aG docker $DEPLOY_USER
fi

# Configure firewall
log_info "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Configure fail2ban
log_info "Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# Optimize system for PyTake
log_info "Optimizing system settings..."

# Increase file limits
cat >> /etc/security/limits.conf << EOF

# PyTake optimizations
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOF

# Kernel optimizations
cat >> /etc/sysctl.conf << EOF

# PyTake network optimizations
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_tw_reuse = 1
net.ipv4.ip_local_port_range = 1024 65535
vm.swappiness = 10
EOF

sysctl -p

# Setup log rotation
log_info "Setting up log rotation..."
cat > /etc/logrotate.d/pytake << EOF
/home/$DEPLOY_USER/pytake/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        /usr/bin/docker exec pytake-backend killall -USR1 simple_api 2>/dev/null || true
    endscript
}
EOF

# Setup automatic updates
log_info "Setting up automatic security updates..."
apt-get install -y unattended-upgrades
cat > /etc/apt/apt.conf.d/50unattended-upgrades << EOF
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
};
EOF

# Create deployment directory
log_info "Creating deployment directory..."
sudo -u $DEPLOY_USER mkdir -p /home/$DEPLOY_USER/pytake
chown $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/pytake

# Install monitoring tools
log_info "Installing monitoring tools..."
apt-get install -y htop iotop nethogs

# Setup Docker daemon configuration
log_info "Configuring Docker daemon..."
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << EOF
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    },
    "live-restore": true,
    "default-ulimits": {
        "nofile": {
            "Name": "nofile",
            "Hard": 65536,
            "Soft": 65536
        }
    }
}
EOF

systemctl restart docker

# Setup backup directory
log_info "Creating backup directory..."
sudo -u $DEPLOY_USER mkdir -p /home/$DEPLOY_USER/pytake/backups

# Create maintenance scripts
log_info "Creating maintenance scripts..."
cat > /home/$DEPLOY_USER/cleanup.sh << 'EOF'
#!/bin/bash
# PyTake maintenance script

echo "Running PyTake maintenance..."

# Clean Docker
docker system prune -f
docker volume prune -f

# Clean logs older than 30 days
find /home/pytake/pytake/logs -name "*.log" -mtime +30 -delete

# Clean old backups (keep last 7)
cd /home/pytake/pytake/backups
ls -t | tail -n +8 | xargs -r rm -rf

echo "Maintenance completed"
EOF

chmod +x /home/$DEPLOY_USER/cleanup.sh
chown $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/cleanup.sh

# Setup cron jobs
log_info "Setting up cron jobs..."
sudo -u $DEPLOY_USER crontab -l 2>/dev/null | { cat; echo "0 2 * * * /home/$DEPLOY_USER/cleanup.sh"; } | sudo -u $DEPLOY_USER crontab -

# Get server information
log_info "Getting server information..."
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

# Final setup message
echo ""
echo "====================================="
log_success "Development Server setup completed! 🎉"
echo "====================================="
echo ""

echo "📋 Server Information:"
echo "   IP Address: $SERVER_IP"
echo "   Deploy User: $DEPLOY_USER"
echo "   Deploy Directory: /home/$DEPLOY_USER/pytake"
echo ""

echo "🔐 Security Features Enabled:"
echo "   ✅ UFW Firewall (ports 22, 80, 443)"
echo "   ✅ Fail2ban"
echo "   ✅ Automatic security updates"
echo "   ✅ Non-root deployment user"
echo ""

echo "📋 Next Steps:"
echo "   1. Clone PyTake repository:"
echo "      sudo -u $DEPLOY_USER git clone https://github.com/xkayo32/pytake-backend.git /home/$DEPLOY_USER/pytake"
echo ""
echo "   2. Configure environment:"
echo "      sudo -u $DEPLOY_USER cp /home/$DEPLOY_USER/pytake/.env.development /home/$DEPLOY_USER/pytake/.env.development.local"
echo "      sudo -u $DEPLOY_USER nano /home/$DEPLOY_USER/pytake/.env.development.local"
echo ""
echo "   3. Configure hostname/domain and SSL:"
echo "      echo 'your-hostname.com' > /etc/hostname"
echo "      hostnamectl set-hostname your-hostname.com"
echo ""
echo "   4. Deploy PyTake with SSL:"
echo "      cd /home/$DEPLOY_USER/pytake"
echo "      sudo -u $DEPLOY_USER ./deploy.sh ssl    # Configure SSL first"
echo "      sudo -u $DEPLOY_USER ./deploy.sh deploy # Then deploy"
echo ""

log_warning "IMPORTANT:"
echo "   - Configure your domain DNS to point to $SERVER_IP"
echo "   - Change hostname to your domain name"
echo "   - Set up SSL certificates (required for WhatsApp webhooks)"
echo "   - Update WhatsApp webhook URL to use HTTPS"
echo "   - Configure .env.development.local with your settings"
echo ""

log_success "Server is ready for PyTake deployment!"