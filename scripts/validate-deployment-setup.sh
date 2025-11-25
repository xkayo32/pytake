#!/bin/bash

# GitHub Secrets Validator for PyTake Production Deployment
# Usage: ./validate-deployment-setup.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   PyTake Production Deployment - Setup Validator           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# 1. Check Local SSH Keys
# ============================================================================
echo -e "${BLUE}[1/5] Checking Local SSH Keys...${NC}"

SSH_KEY_PATH="${HOME}/.ssh/pytake_deploy"

if [ -f "$SSH_KEY_PATH" ]; then
    echo -e "${GREEN}✅${NC} SSH private key found: $SSH_KEY_PATH"
    
    # Check permissions
    PERMS=$(stat -L -c "%a" "$SSH_KEY_PATH")
    if [ "$PERMS" = "600" ]; then
        echo -e "${GREEN}✅${NC} SSH key permissions correct (600)"
    else
        echo -e "${YELLOW}⚠️${NC}  SSH key permissions incorrect: $PERMS (should be 600)"
        chmod 600 "$SSH_KEY_PATH"
        echo -e "${GREEN}✅${NC} Fixed permissions to 600"
    fi
    
    # Validate key format
    if head -1 "$SSH_KEY_PATH" | grep -q "BEGIN.*PRIVATE KEY"; then
        echo -e "${GREEN}✅${NC} SSH key format valid (PEM)"
    else
        echo -e "${RED}❌${NC} SSH key format invalid (expected PEM format)"
        exit 1
    fi
else
    echo -e "${RED}❌${NC} SSH private key not found: $SSH_KEY_PATH"
    echo ""
    echo "Generate SSH key with:"
    echo "  ssh-keygen -t ed25519 -C 'pytake-github-actions' -f ~/.ssh/pytake_deploy -N ''"
    exit 1
fi

SSH_PUB_PATH="${SSH_KEY_PATH}.pub"
if [ -f "$SSH_PUB_PATH" ]; then
    echo -e "${GREEN}✅${NC} SSH public key found: $SSH_PUB_PATH"
else
    echo -e "${RED}❌${NC} SSH public key not found: $SSH_PUB_PATH"
    exit 1
fi

echo ""

# ============================================================================
# 2. Check GitHub Secrets Configured
# ============================================================================
echo -e "${BLUE}[2/5] Checking GitHub Secrets Configuration...${NC}"

echo -e "${YELLOW}ℹ️${NC}  This validator cannot automatically check GitHub secrets."
echo "    To verify secrets are set, check:"
echo "    https://github.com/xkayo32/pytake/settings/secrets/actions"
echo ""

REQUIRED_SECRETS=(
    "PROD_HOST"
    "PROD_USER"
    "PROD_SSH_KEY"
    "PROD_DATABASE_URL"
    "PROD_SECRET_KEY"
)

echo "Required secrets to configure in GitHub:"
for secret in "${REQUIRED_SECRETS[@]}"; do
    echo -e "  ${YELLOW}☐${NC} $secret"
done

echo ""

# ============================================================================
# 3. Validate Production Server Configuration
# ============================================================================
echo -e "${BLUE}[3/5] Testing SSH Connection to Production Server...${NC}"

if [ -z "$PROD_HOST" ]; then
    echo -e "${YELLOW}ℹ️${NC}  PROD_HOST not set in environment. Set it to test connection:"
    echo "    export PROD_HOST='209.105.242.206'"
    echo "    export PROD_USER='deploy'"
    echo "    ./validate-deployment-setup.sh"
    echo ""
else
    echo "Testing SSH connection to: $PROD_HOST (user: $PROD_USER)"
    
    if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=accept-new \
           -i "$SSH_KEY_PATH" "$PROD_USER@$PROD_HOST" \
           "echo '✅ SSH connection successful'" 2>/dev/null; then
        echo -e "${GREEN}✅${NC} SSH connection to production server successful"
        
        # Check Docker
        if ssh -i "$SSH_KEY_PATH" "$PROD_USER@$PROD_HOST" \
               "docker --version" 2>/dev/null; then
            echo -e "${GREEN}✅${NC} Docker installed on production server"
        else
            echo -e "${YELLOW}⚠️${NC}  Docker not accessible via SSH"
        fi
        
        # Check docker-compose
        if ssh -i "$SSH_KEY_PATH" "$PROD_USER@$PROD_HOST" \
               "docker-compose --version" 2>/dev/null; then
            echo -e "${GREEN}✅${NC} Docker Compose installed on production server"
        else
            echo -e "${YELLOW}⚠️${NC}  Docker Compose not accessible via SSH"
        fi
        
        # Check /opt/pytake directory
        if ssh -i "$SSH_KEY_PATH" "$PROD_USER@$PROD_HOST" \
               "test -d /opt/pytake && echo exists" 2>/dev/null | grep -q exists; then
            echo -e "${GREEN}✅${NC} /opt/pytake directory exists on production server"
        else
            echo -e "${YELLOW}⚠️${NC}  /opt/pytake directory not found (will be created during first deploy)"
        fi
    else
        echo -e "${RED}❌${NC} SSH connection failed to $PROD_HOST"
        echo ""
        echo "Troubleshooting:"
        echo "  1. Check PROD_HOST is correct: $PROD_HOST"
        echo "  2. Check PROD_USER is correct: $PROD_USER"
        echo "  3. Verify SSH key is added to server:"
        echo "     cat ${SSH_PUB_PATH} | ssh-copy-id -i ${SSH_KEY_PATH} ${PROD_USER}@${PROD_HOST}"
        echo "  4. Test manually:"
        echo "     ssh -i ${SSH_KEY_PATH} ${PROD_USER}@${PROD_HOST}"
        exit 1
    fi
fi

echo ""

# ============================================================================
# 4. Check GitHub Actions Workflows
# ============================================================================
echo -e "${BLUE}[4/5] Checking GitHub Actions Workflows...${NC}"

WORKFLOWS=(
    ".github/workflows/lint.yml"
    ".github/workflows/test.yml"
    ".github/workflows/build-images.yml"
    ".github/workflows/deploy.yml"
)

for workflow in "${WORKFLOWS[@]}"; do
    if [ -f "$workflow" ]; then
        echo -e "${GREEN}✅${NC} $workflow"
    else
        echo -e "${RED}❌${NC} $workflow (missing)"
    fi
done

echo ""

# ============================================================================
# 5. Check Documentation
# ============================================================================
echo -e "${BLUE}[5/5] Checking Documentation Files...${NC}"

DOCS=(
    "PRODUCTION_DEPLOYMENT.md"
    ".github/GITHUB_SECRETS_SETUP.md"
    ".github/CI_CD_IMPROVEMENTS.md"
    ".github/GIT_WORKFLOW.md"
    ".github/AGENT_INSTRUCTIONS.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✅${NC} $doc"
    else
        echo -e "${YELLOW}⚠️${NC}  $doc (optional)"
    fi
done

echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Setup Summary                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Local setup validated${NC}"
echo ""
echo "Next steps to enable production deployment:"
echo ""
echo "1. Configure GitHub Secrets:"
echo -e "   ${YELLOW}https://github.com/xkayo32/pytake/settings/secrets/actions${NC}"
echo ""
echo "2. Add these secrets:"
echo -e "   ${YELLOW}PROD_HOST${NC}         = IP or hostname of production server"
echo -e "   ${YELLOW}PROD_USER${NC}         = SSH user for deployment"
echo -e "   ${YELLOW}PROD_SSH_KEY${NC}      = Contents of ${SSH_KEY_PATH}"
echo -e "   ${YELLOW}PROD_DATABASE_URL${NC} = PostgreSQL connection string"
echo -e "   ${YELLOW}PROD_SECRET_KEY${NC}   = Random secret for JWT (openssl rand -hex 32)"
echo ""
echo "3. Setup production server:"
echo -e "   See: ${YELLOW}PRODUCTION_DEPLOYMENT.md${NC}"
echo ""
echo "4. Trigger deployment:"
echo -e "   ${YELLOW}https://github.com/xkayo32/pytake/actions/workflows/deploy.yml${NC}"
echo "   Click 'Run workflow' → Select 'production' → Run"
echo ""

# Copy SSH public key to clipboard (if xclip available)
if command -v xclip &> /dev/null; then
    echo -e "${BLUE}💡 Tip: SSH public key copied to clipboard${NC}"
    cat "$SSH_PUB_PATH" | xclip -selection clipboard
elif command -v pbcopy &> /dev/null; then
    echo -e "${BLUE}💡 Tip: SSH public key copied to clipboard${NC}"
    cat "$SSH_PUB_PATH" | pbcopy
else
    echo -e "${BLUE}💡 SSH public key location: ${SSH_PUB_PATH}${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Setup validation complete!${NC}"
echo ""
