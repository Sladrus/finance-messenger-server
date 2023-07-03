const {
  createConversation,
  findAllConversations,
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
    getConversations();
  };

  // регистрируем обработчики
  socket.on('conversation:get', getConversations);
  socket.on('conversation:add', addConversation);
  //   socket.on('message:remove', removeMessage);
  module.exports.addConversation = addConversation;
  module.exports.getConversations = getConversations;
};
