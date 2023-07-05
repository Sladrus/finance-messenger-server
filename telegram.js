const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
// const token = '5986400520:AAHd61GLW0C2TXQpSAtS4FSVkNvPWGn0MM0';
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

module.exports = { bot };
