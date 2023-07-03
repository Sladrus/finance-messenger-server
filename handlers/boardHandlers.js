const {
  findStages,
  createStage,
  updateStages,
  changeStage,
} = require('../db/services/stageService');
const registerConversationHandlers = require('../handlers/conversationHandlers');

module.exports = (io, socket) => {
  const getStatuses = async () => {
    console.log('STAGES');
    const stages = await findStages();
    io.emit('statuses', stages);
  };

  const addStatus = async (newStage) => {
    const stage = await createStage(newStage);
    await getStatuses();
  };

  const updateStatuses = async (newStages) => {
    const stages = await updateStages(newStages);
    await getStatuses();
    await registerConversationHandlers.getConversations();
  };

  const updateStatus = async ({ id, value }) => {
    const stage = await changeStage(id, value);
    await getStatuses();
    await registerConversationHandlers.getConversations();
  };

  socket.on('status:get', getStatuses);
  socket.on('status:add', addStatus);
  socket.on('status:update', updateStatuses);
  socket.on('status:change', updateStatus);

  module.exports.getStatuses = getStatuses;
};
