module.exports = {
  apps : [{
    name   : "ChatGPT Selfbot",
    script : "./index.js",
    out_file: '/var/log/pm2/ChatGPT-Selfbot/log.log',
    error_file: '/var/log/pm2/ChatGPT-Selfbot/error.log',
    env: {
      "NODE_ENV": "production",
    }
  }]
}
