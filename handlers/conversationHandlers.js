const {
  createConversation,
  findAllConversations,
  updateConversation,
} = require('../db/services/conversationService');

module.exports = (io, socket) => {
  const getConversations = async () => {
    console.log('CONVERSATIONS');
    const conversations = await findAllConversations();
    io.emit('conversations', conversations);
  };

  const addConversation = async (conversation, chatId) => {
    // conversations.push(conversation);
    const createdConversation = await createConversation(conversation);
    await getConversations();
  };

  const changeConversation = async (newConversation) => {
    // conversations.push(conversation);
    const createdConversation = await updateConversation(newConversation._id, {
      user: newConversation?.user,
    });
    await getConversations();
    // await registerBoardHandlers.getStatuses();
  };

  // регистрируем обработчики
  socket.on('conversation:get', getConversations);
  socket.on('conversation:add', addConversation);
  socket.on('conversation:update', changeConversation);

  //   socket.on('message:remove', removeMessage);
  module.exports.addConversation = addConversation;
  module.exports.getConversations = getConversations;
  module.exports.changeConversation = changeConversation;
};
