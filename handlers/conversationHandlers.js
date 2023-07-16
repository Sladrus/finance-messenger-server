const {
  createConversation,
  findAllConversations,
  updateConversation,
} = require('../db/services/conversationService');
const { addMessage } = require('./messageHandlers');

module.exports = (io, socket) => {
  const getConversations = async () => {
    console.log('CONVERSATIONS');
    const conversations = await findAllConversations();
    io.emit('conversations', conversations);
  };

  // const addConversation = async (conversation, chatId) => {
  //   const createdConversation = await createConversation(conversation);
  //   await getConversations();
  // };

  const changeConversation = async (newConversation) => {
    const createdConversation = await updateConversation(newConversation._id, {
      user: newConversation?.user,
    });
    // await addMessage()
    await getConversations();
  };

  // регистрируем обработчики
  socket.on('conversation:get', getConversations);
  // socket.on('conversation:add', addConversation);
  socket.on('conversation:link', changeConversation);

  //   socket.on('message:remove', removeMessage);
  // module.exports.addConversation = addConversation;
  module.exports.getConversations = getConversations;
  module.exports.changeConversation = changeConversation;
};
