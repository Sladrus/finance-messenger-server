const { ConversationModel } = require('../models/conversationModel');
const { StageModel } = require('../models/stageModel');
const conversationService = require('./conversationService');

class StageService {
  async createStage(body) {
    const stage = await StageModel.create(body);
    return stage;
  }

  async findStageBy(value) {
    const stage = await StageModel.findOne({ value });
    // console.log(stages.conversations);
    return stage;
  }

  async findStages() {
    const stages = await StageModel.find().populate({
      path: 'conversations',
      populate: [{ path: 'messages' }, { path: 'user' }],
    });
    // console.log(stages.conversations);
    return stages;
  }

  async addConversationToStage(id, value) {
    // console.log(id, value);
    const stage = await StageModel.findOne({ value: value });
    // console.log(stage);
    stage.conversations.push(id);
    await stage.save();
  }

  async updateStages(stages) {
    await Promise.all(
      stages.map(async (stage) => {
        const { _id, conversations } = stage;
        const conversationIds = conversations.map((conv) => conv._id);

        // Update the conversations with the new stage id
        await ConversationModel.updateMany(
          { _id: { $in: conversationIds } },
          { $set: { stage: _id } }
        );

        // Update the stage with the new conversation ids
        await StageModel.findOneAndUpdate(
          { _id: _id },
          { $set: { conversations: conversationIds } }
        );
      })
    );
  }

  async changeStage(id, value, position) {
    const conversation = await ConversationModel.findOne({ _id: id });
    const { _id: conversationId, stage: oldStageId } = conversation;
    const newStage = await StageModel.findOne({ value: value });
    const oldStage = await StageModel.findOne({ _id: oldStageId });

    if (newStage._id.toString() === oldStage._id.toString()) {
      oldStage.conversations.pull(conversationId);
      if (position === -1) {
        oldStage.conversations.unshift(conversationId); // Вставляем в начало массива
      } else {
        oldStage.conversations.splice(position, 0, conversationId); // Вставляем на указанную позицию
      }
      await Promise.all([oldStage.save(), conversation.save()]);
    } else {
      await ConversationModel.findByIdAndUpdate(id, { stage: newStage._id });
      oldStage.conversations.pull(conversationId);
      if (position === -1) {
        newStage.conversations.unshift(conversationId); // Вставляем в начало массива
      } else {
        newStage.conversations.splice(position, 0, conversationId); // Вставляем на указанную позицию
      }
      await Promise.all([
        oldStage.save(),
        newStage.save(),
        conversation.save(),
      ]);
    }
  }
}

module.exports = new StageService();
