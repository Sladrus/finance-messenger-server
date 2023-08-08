// настраиваем БД
// const low = require('lowdb')
// БД хранится в директории "db" под названием "messages.json"
// const adapter = new FileSync('db/messages.json');
// const db = low(adapter);

const conversations = require('../db/conversations');
const { ConversationModel } = require('../db/models/conversationModel');
const {
  findOneConversation,
  findMessagesByChat,
  createConversation,
  readConversation,
  updateConversation,
} = require('../db/services/conversationService');
const { createMessage } = require('../db/services/messageService');
const { bot } = require('../telegram');
const registerBoardHandlers = require('../handlers/boardHandlers');
const registerNotificationHandlers = require('../handlers/notificationHandlers');
const { findStages, changeStage } = require('../db/services/stageService');
const { default: axios } = require('axios');
const { getConversations } = require('./conversationHandlers');

const token = process.env.API_TOKEN;

const baseApi = axios.create({
  baseURL: 'http://20.67.242.227/bot',
  headers: { 'x-api-key': `${token}` },
});

async function createMoneysend(body) {
  try {
    const response = await baseApi.post(`/task/moneysend`, body);
    return response.data;
  } catch (error) {
    console.log(error);
  }
}

module.exports = (io, socket) => {
  const getStatuses = async () => {
    console.log('STAGES');
    const stages = await findStages();
    io.emit('statuses', stages);
  };
  // обрабатываем запрос на получение сообщений
  const getMessages = async () => {
    console.log('MESSAGES');
    if (Number(socket.roomId) === 0) return;
    try {
      const messages = await findMessagesByChat({
        chat_id: Number(socket.roomId),
      });
      io.in(socket.roomId).emit('messages', messages);
    } catch (e) {
      console.log(e);
    }
  };

  const moneysend = async ({ chat_id, data }) => {
    try {
      const conversation = await findOneConversation({ chat_id: chat_id });
      if (!data?.link) {
        const link = await bot.exportChatInviteLink(chat_id);
        await updateConversation(conversation._id, {
          link,
        });
        data.link = link;
      }
      console.log(data);
      var timestamp = Date.now();

      // Преобразуем таймстамп в объект даты
      var date = new Date(timestamp);

      // Определяем необходимый формат даты (например, 'dd.mm.yyyy')
      var formatOptions = {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
      };
      var formattedDate = date.toLocaleDateString('ru-RU', formatOptions);
      const text = `${data.title} от ${data.user.username}\n\n→ ${data?.link}\n\n<pre>Объем: ${data?.volume}\n\n← Отдают: ${data?.give}\n→ Получают: ${data?.take}\n\n• Регулярность: ${data?.regularity}\n• Сроки: ${data?.date}\n• Комментарий: ${data?.comment}\n\nУсловия: ${data?.conditions}</pre>\n\n———\nChat ID: ${chat_id}\nДата: ${formattedDate}`;
      const response = await createMoneysend({
        chat_id: chat_id,
        task: text,
        manager_id: 1,
        create_date: Date.now(),
      });
      //-1001815632960
      const message = await bot.sendMessage(-1001815632960, text, {
        parse_mode: 'HTML',
      });
      message.type = 'text';
      message.from.id = data.user._id;
      message.from.first_name = data.user.username;
      message.unread = false;
      const createdMessage = await createMessage(-1001815632960, message);
      // console.log(createdMessage);
      const msg = await bot.sendMessage(
        chat_id,
        `Отлично! Задача зарегестрированна под номером ${response?.id}, уже зову специалиста отдела процессинга. Пожалуйста, ожидайте.\n\n<pre>Объем: ${data?.volume}\n\n← Отдают: ${data?.give}\n→ Получают: ${data?.take}\n\n• Регулярность: ${data?.regularity}\n• Сроки: ${data?.date}\n• Комментарий: ${data?.comment}\n\nУсловия: ${data?.conditions}</pre>`,
        {
          parse_mode: 'HTML',
        }
      );
      msg.type = 'text';
      msg.from.id = data.user._id;
      msg.from.first_name = data.user.username;
      msg.unread = false;
      const crtMsg = await createMessage(chat_id, msg);
      const { oldTmp, newTmp } = await changeStage(
        conversation._id,
        'task',
        -1
      );
      io.emit('statuses:load', { oldTmp, newTmp });
      const conversationTmp = await findOneConversation({ chat_id: chat_id });
      io.emit('status:conversation', conversationTmp);

      await getMessages();
      // io.emit('conversations', conversations);
      // await getStatuses();
    } catch (e) {
      console.log(e);
    }
  };

  const addMessage = async (message, chatId) => {
    console.log(chatId);
    const msg = message?.isBot
      ? await bot.sendMessage(message.selectedConversation, message.text)
      : message;
    msg.type = message.type;
    const conversation = await findOneConversation({ chat_id: chatId });
    // console.log(conversation);
    if (!message?.isBot) {
      if (!conversation)
        await createConversation({
          title: message.chat.title,
          chat_id: message.chat.id,
          unreadCount: 0,
          createdAt: message.date,
          updatedAt: message.date,
        });
    }
    if (message?.isBot) {
      msg.from.id = message.user._id;
      msg.from.first_name = message.user.username;
      msg.unread = false;
      await readConversation(msg.chat.id);
    }

    const createdMessage = await createMessage(
      Number(chatId ? chatId : socket.roomId),
      msg
    );
    if (!message.isBot)
      await registerNotificationHandlers.pushNotification(msg);

    const conversationTmp = await findOneConversation({
      chat_id: !message.isBot ? chatId : message.selectedConversation,
    });
    if (!message.isBot) {
      conversationTmp.unreadCount += 1;
      await conversationTmp.save();
    }
    io.emit('status:conversation', conversationTmp);
    await getMessages();
  };

  const addMessageWithRetry = async (message, chatId) => {
    try {
      await addMessage(message, chatId);
    } catch (error) {
      console.error('Произошла ошибка:', error);
      setTimeout(
        () => addMessageWithRetry(message, chatId),
        error?.response?.body?.parameters?.retry_after * 1000
      ); // Повторный вызов через 5 секунд
    }
  };

  // регистрируем обработчики
  socket.on('message:get', getMessages);
  socket.on('message:moneysend', moneysend);
  socket.on('message:add', (message, chatId) => {
    addMessageWithRetry(message, chatId);
  }); //   socket.on('message:remove', removeMessage);
  module.exports.addMessage = addMessage;
  module.exports.getMessages = getMessages;
};
