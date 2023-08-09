const {
  findAllConversations,
  updateConversation,
  readConversation,
  findMessagesByChat,
  linkConversation,
  findOneConversation,
  changeuserConversation,
} = require('../db/services/conversationService');
const { createMessage } = require('../db/services/messageService');
const { findStages } = require('../db/services/stageService');
// const { addMessage } = require('./messageHandlers');
const { bot } = require('../telegram');

const getStatuses = async (io, socket) => {
  console.log('STAGES');
  const stages = await findStages();
  io.emit('statuses', stages);
};

const getMessages = async (io, socket) => {
  console.log('MESSAGES');
  console.log(socket.roomId, 'TYT');
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
  const createdMessage = await createMessage(chatId, message);
};

module.exports = (io, socket) => {
  const getConversations = async () => {
    console.log('CONVERSATIONS');
    const conversations = await findAllConversations();
    socket.emit('conversations', conversations);
  };

  const refreshLink = async ({ chat_id }) => {
    try {
      const link = await bot.exportChatInviteLink(chat_id);
      const conversation = await findOneConversation({ chat_id: chat_id });
      await updateConversation(conversation._id, {
        link,
      });
      const conversationTmp = await findOneConversation({ chat_id: chat_id });
      io.emit('status:conversation', conversationTmp);
    } catch (e) {
      console.log(e);
    }
  };

  const readConversations = async ({ chat_id }) => {
    const conversation = await readConversation(chat_id);
    // const conversationTmp = await findOneConversation({ chat_id: chat_id });

    io.emit('status:conversation', conversation);
    const messages = await findMessagesByChat({
      chat_id: chat_id,
    });
    io.in(chat_id).emit('messages', messages);
    // io.emit('status:conversation', conversation);
    // await getConversations();
    // await getMessages(io, socket);
    // await getStatuses(io, socket);
  };
  // const addConversation = async (conversation, chatId) => {
  //   const createdConversation = await createConversation(conversation);
  //   await getConversations();
  // };

  const changeuserConversations = async ({ chat_id, user }) => {
    console.log(chat_id, user);
    const conversation = await changeuserConversation(chat_id, user);
    await addMessage(
      {
        type: 'event',
        from: {
          id: 1274681231,
          first_name: user ? user.username : conversation.user.username,
        },
        text: `${user ? user?.username : conversation.user?.username} ${
          user ? 'привязал' : 'отвязал'
        } чат`,
        unread: false,
        date: Date.now() / 1000,
      },
      chat_id
    );

    const conversationTmp = await findOneConversation({ chat_id: chat_id });

    io.emit('status:conversation', conversationTmp);
    const messages = await findMessagesByChat({
      chat_id: chat_id,
    });
    io.in(chat_id).emit('messages', messages);
  };

  const linkConversations = async ({ chat_id, user }) => {
    // console.log(chat_id, user);
    const conversation = await linkConversation(chat_id, user);
    await addMessage(
      {
        type: 'event',
        from: { id: 1274681231, first_name: user.username },
        text: `${user.username} ${
          conversation?.user ? 'отвязал' : 'привязал'
        } чат`,
        unread: false,
        date: Date.now() / 1000,
      },
      chat_id
    );

    const conversationTmp = await findOneConversation({ chat_id: chat_id });

    io.emit('status:conversation', conversationTmp);
    const messages = await findMessagesByChat({
      chat_id: chat_id,
    });
    io.in(chat_id).emit('messages', messages);
  };

  // регистрируем обработчики
  socket.on('conversation:get', getConversations);
  socket.on('conversation:refresh', refreshLink);
  socket.on('conversation:read', readConversations);
  socket.on('conversation:link', linkConversations);
  socket.on('conversation:changeuser', changeuserConversations);

  //   socket.on('message:remove', removeMessage);
  // module.exports.addConversation = addConversation;
  module.exports.getConversations = getConversations;
  module.exports.linkConversations = linkConversations;
  module.exports.readConversations = readConversations;
};
