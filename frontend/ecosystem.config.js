module.exports = {
  apps: [{
    name: 'pytake-frontend',
    script: 'npm',
    args: 'run dev -- --port 3003 --hostname 0.0.0.0',
    cwd: '/home/administrator/pytake-backend/pytake-frontend',
    env: {
      NODE_ENV: 'development',
      NEXT_TELEMETRY_DISABLED: '1',
      FORCE_COLOR: '1'
    },
    watch: false,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G',
    error_file: '/tmp/pytake-frontend-error.log',
    out_file: '/tmp/pytake-frontend-out.log',
    log_file: '/tmp/pytake-frontend-combined.log',
    time: true
  }]
};