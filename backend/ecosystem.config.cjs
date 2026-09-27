module.exports = {
  apps: [
    {
      name: "codefirstsystem-32-whatsapp-crm-api",
      script: "dist/server.js",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      watch: false,
      autorestart: true,
      stop_exit_codes: [1],        // do not restart on fatal exits (e.g. license failure)
      max_restarts: 10,
      min_uptime: "5s",
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 3040
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 3040
      },
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true
    },
    {
      name: "codefirstsystem-32-whatsapp-crm-worker",
      script: "dist/worker.js",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      watch: false,
      autorestart: true,
      stop_exit_codes: [1],
      max_restarts: 10,
      min_uptime: "5s",
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
        RUN_SINGLETON_WORKERS: "1"
      },
      env_development: {
        NODE_ENV: "development"
      },
      error_file: "./logs/worker-error.log",
      out_file: "./logs/worker-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true
    },
    {
      name: "codefirstsystem-32-whatsapp-camp-submit-worker",
      script: "dist/worker.js",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      watch: false,
      autorestart: true,
      stop_exit_codes: [1],
      max_restarts: 10,
      min_uptime: "5s",
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production"
      },
      env_development: {
        NODE_ENV: "development"
      },
      error_file: "./logs/camp-submit-error.log",
      out_file: "./logs/camp-submit-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true
    },
  ]
};
