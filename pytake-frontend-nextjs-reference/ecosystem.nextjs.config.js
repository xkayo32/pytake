module.exports = {
  apps: [{
    name: 'nextjs-pytake',
    script: 'npm',
    args: 'run dev -- --port 3002',
    cwd: '/home/administrator/pytake-backend/pytake-frontend-nextjs-reference',
    env: {
      NODE_ENV: 'development',
      PORT: '3002'
    },
    watch: false,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    exec_mode: 'fork',
    instances: 1,
    log_file: '/tmp/nextjs-pm2.log',
    out_file: '/tmp/nextjs-pm2.out',
    error_file: '/tmp/nextjs-pm2.err',
    time: true
  }]
}