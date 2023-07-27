const {
  findStages,
  createStage,
  updateStages,
  changeStage,
  updateStage,
  deleteStage,
  moveRecordToPosition,
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
    // console.log(stage);
    await getStatuses();
  };

  const updateStatus = async (stage) => {
    // console.log(stage);

    const newStage = await updateStage(stage);
    await getStatuses();
    // await registerConversationHandlers.getConversations();
  };

  const deleteStatus = async (data) => {
    await deleteStage(data);
    // const stages = await updateStages(newStages);
    await getStatuses();
    // await registerConversationHandlers.getConversations();
  };

  const changeStatus = async ({ id, value, position }) => {
    const stage = await changeStage(id, value, position);
    await getStatuses();
    // await registerConversationHandlers.getConversations();
  };

  const moveStatus = async ({ position, value }) => {
    const stage = await moveRecordToPosition(position, value);
    await getStatuses();
    // await registerConversationHandlers.getConversations();
  };
  socket.on('status:get', getStatuses);
  socket.on('status:add', addStatus);
  socket.on('status:update', updateStatus);
  socket.on('status:change', changeStatus);
  socket.on('status:move', moveStatus);
  socket.on('status:delete', deleteStatus);

  module.exports.getStatuses = getStatuses;
};
