module.exports = {
  apps: [
    {
      name: 'claude-code-ui',
      script: 'backend/dist/index.js',
      cwd: '/home/exedev/claude-code-ui',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 8000
      }
    }
  ]
};
