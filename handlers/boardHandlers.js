const { findOneConversation } = require('../db/services/conversationService');
const {
  findStages,
  createStage,
  updateStages,
  changeStage,
  updateStage,
  deleteStage,
  moveRecordToPosition,
  findStageByValue,
} = require('../db/services/stageService');
const registerConversationHandlers = require('../handlers/conversationHandlers');

module.exports = (io, socket) => {
  const getStatuses = async () => {
    console.log('STAGES');
    const stages = await findStages();
    socket.emit('statuses', stages);
  };

  const addStatus = async (newStage) => {
    const stage = await createStage(newStage);
    const stages = await findStages();
    io.emit('statuses', stages);
  };

  const updateStatus = async (stage) => {
    // console.log(stage);

    const newStage = await updateStage(stage);
    io.emit('status:updated', newStage);

    // await getStatuses();
    // await registerConversationHandlers.getConversations();
  };

  const deleteStatus = async (data) => {
    await deleteStage(data);
    io.emit('status:deleted', data.id);

    // const stages = await updateStages(newStages);
    // await getStatuses();
    // await registerConversationHandlers.getConversations();
  };

  const changeStatus = async ({ id, value, position }) => {
    const { oldTmp, newTmp } = await changeStage(id, value, position);
    console.log(oldTmp, newTmp);
    io.emit('statuses:load', { oldTmp, newTmp });
    const conversationTmp = await findOneConversation({ _id: id });
    io.emit('status:conversation', conversationTmp);
    // io.emit('status:load', newStage);

    // await getStatuses();
    // await registerConversationHandlers.getConversations();
  };

  const moveStatus = async ({ position, value }) => {
    const stage = await moveRecordToPosition(position, value);
    const stages = await findStages();
    io.emit('statuses', stages);

    // await getStatuses();
    // await registerConversationHandlers.getConversations();
  };

  const getStatusByValue = async ({ value }) => {
    console.log(value);
    const stage = await findStageByValue(value);
    io.emit('status:load', stage);
  };

  socket.on('status:value', getStatusByValue);

  socket.on('status:get', getStatuses);
  socket.on('status:add', addStatus);
  socket.on('status:update', updateStatus);
  socket.on('status:change', changeStatus);
  socket.on('status:move', moveStatus);
  socket.on('status:delete', deleteStatus);

  module.exports.getStatuses = getStatuses;
};
