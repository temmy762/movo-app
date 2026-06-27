module.exports = {
  apps: [
    {
      name: "movo-web",
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
