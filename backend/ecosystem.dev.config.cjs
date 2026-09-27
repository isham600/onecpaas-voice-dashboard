module.exports = {
  apps: [
    {
      name: "codefirstsystem-32-wa-api-dev",
      script: "src/server.ts",
      interpreter: "node",
      interpreter_args: "--import tsx",
      exec_mode: "fork",
      instances: 1,
      watch: ["src"],
      ignore_watch: ["node_modules", "dist", "deploy", "logs"],
      autorestart: true,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "development",
        PORT: 3040
      },
      error_file: "./logs/dev-error.log",
      out_file: "./logs/dev-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true
    },
    {
      name: "codefirstsystem-32-wa-worker-dev",
      script: "src/worker.ts",
      interpreter: "node",
      interpreter_args: "--import tsx",
      exec_mode: "fork",
      instances: 1,
      watch: ["src/worker.ts", "src/workers", "src/queues"],
      ignore_watch: ["node_modules", "dist", "deploy", "logs"],
      autorestart: true,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "development",
        RUN_SINGLETON_WORKERS: "1"
      },
      error_file: "./logs/dev-worker-error.log",
      out_file: "./logs/dev-worker-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true
    },
    {
      name: "codefirstsystem-32-wa-camp-submit-worker-dev",
      script: "src/worker.ts",
      interpreter: "node",
      interpreter_args: "--import tsx",
      exec_mode: "fork",
      instances: 1,
      watch: ["src/worker.ts", "src/workers", "src/queues"],
      ignore_watch: ["node_modules", "dist", "deploy", "logs"],
      autorestart: true,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "development"
      },
      error_file: "./logs/dev-camp-submit-error.log",
      out_file: "./logs/dev-camp-submit-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true
    }
  ]
};
