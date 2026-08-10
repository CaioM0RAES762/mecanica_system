module.exports = {
  apps: [
    {
      name: 'mecanica-api',
      script: './pm2-runner.cjs',
      autorestart: true,
      watch: false,
      windowsHide: true,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      env: {
        NODE_ENV: 'development',
        PORT: '4001',
        PM2_APP: 'api',
      },
    },
    {
      name: 'mecanica-web',
      script: './pm2-runner.cjs',
      autorestart: true,
      watch: false,
      windowsHide: true,
      max_memory_restart: '1024M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
        PM2_APP: 'web',
      },
    },
  ],
};
