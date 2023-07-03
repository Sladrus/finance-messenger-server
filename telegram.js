const TelegramBot = require('node-telegram-bot-api');

const token = '5986400520:AAHd61GLW0C2TXQpSAtS4FSVkNvPWGn0MM0';
const bot = new TelegramBot(token, { polling: true });


module.exports = { bot };
