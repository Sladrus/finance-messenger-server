const {
  findAllConversations,
  updateConversation,
  readConversation,
  findMessagesByChat,
  linkConversation,
  findOneConversation,
} = require('../db/services/conversationService');
const { createMessage } = require('../db/services/messageService');
const { findStages } = require('../db/services/stageService');
// const { addMessage } = require('./messageHandlers');

const getStatuses = async (io, socket) => {
  console.log('STAGES');
  const stages = await findStages();
  io.emit('statuses', stages);
};

const getMessages = async (io, socket) => {
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
  const createdMessage = await createMessage(chatId, message);
};

module.exports = (io, socket) => {
  const getConversations = async () => {
    console.log('CONVERSATIONS');
    const conversations = await findAllConversations();
    io.emit('conversations', conversations);
  };

  const readConversations = async ({ chat_id }) => {
    const conversation = await readConversation(chat_id);
    await getConversations();
    await getMessages(io, socket);
    await getStatuses(io, socket);
  };
  // const addConversation = async (conversation, chatId) => {
  //   const createdConversation = await createConversation(conversation);
  //   await getConversations();
  // };

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
        date: Date.now(),
      },
      chat_id
    );
    // const createdConversation = await updateConversation(newConversation._id, {
    //   user: newConversation?.user,
    // });
    // await addMessage()
    await getConversations();
    await getMessages(io, socket);
    await getStatuses(io, socket);

    // await getStatuses(io, socket);
  };

  // регистрируем обработчики
  socket.on('conversation:get', getConversations);
  socket.on('conversation:read', readConversations);
  socket.on('conversation:link', linkConversations);

  //   socket.on('message:remove', removeMessage);
  // module.exports.addConversation = addConversation;
  module.exports.getConversations = getConversations;
  module.exports.linkConversations = linkConversations;
  module.exports.readConversations = readConversations;
};
