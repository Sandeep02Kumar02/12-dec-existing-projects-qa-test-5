// PM2 process-manager configuration for the hello_world HTTP service.
// Consumed by the "prod" and "reload" npm scripts:
//   pm2 start ecosystem.config.js --env production
//   pm2 reload ecosystem.config.js --env production
module.exports = {
  apps: [
    {
      // Process identity and entry point (kept in sync with package.json "main").
      name: 'hello_world',
      script: './server.js',

      // Clustered execution across all available CPU cores.
      instances: 'max',
      exec_mode: 'cluster',

      // Restart / stability policy.
      max_memory_restart: '300M',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',

      // Log destinations (the logs/ directory is git-ignored except for .gitkeep).
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Default (development) environment — preserves the original 127.0.0.1:3000 bind.
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        HOST: '127.0.0.1'
      },

      // Production environment — binds 0.0.0.0 for container/host exposure.
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0'
      }
    }
  ]
};
