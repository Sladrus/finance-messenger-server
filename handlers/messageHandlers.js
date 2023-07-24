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
} = require('../db/services/conversationService');
const { createMessage } = require('../db/services/messageService');
const { bot } = require('../telegram');
const registerBoardHandlers = require('../handlers/boardHandlers');
const registerNotificationHandlers = require('../handlers/notificationHandlers');

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
  const addMessage = async (message, chatId) => {
    console.log(message);
    const msg = message?.isBot
      ? await bot.sendMessage(message.selectedConversation, message.text)
      : message;
    msg.type = message.type;
    const conversation = await findOneConversation({ chat_id: chatId });

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

    await getMessages();
    await getStatuses();
    // await registerBoardHandlers.getStatuses();
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
  socket.on('message:add', (message, chatId) => {
    addMessageWithRetry(message, chatId);
  }); //   socket.on('message:remove', removeMessage);
  module.exports.addMessage = addMessage;
};
