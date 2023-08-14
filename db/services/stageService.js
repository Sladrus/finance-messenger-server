const { ConversationModel } = require('../models/conversationModel');
const { StageModel } = require('../models/stageModel');
const conversationService = require('./conversationService');

class StageService {
  async createStage(body) {
    const maxPosition = await StageModel.find().sort({ position: -1 }).limit(1);

    let newPosition = 0;
    if (maxPosition.length > 0) {
      newPosition = maxPosition[0].position + 1;
    }

    const newStage = { ...body, position: newPosition };
    const stage = await StageModel.create(newStage);
    return stage;
  }

  async findStageByValue(value) {
    const stage = await StageModel.findOne({ value }).populate({
      path: 'conversations',
      populate: [{ path: 'messages' }, { path: 'user' }, { path: 'tasks' }],
    });
    return stage;
  }

  async findStageBy(value) {
    const stage = await StageModel.findOne({ value });
    return stage;
  }

  async findStages() {
    const stages = await StageModel.find({}, { conversations: 0 }).sort({
      position: 1,
    });
    console.log(stages);
    //.populate({
    // path: 'conversations',
    // populate: [{ path: 'messages' }, { path: 'user' }],
    // });
    // console.log(stages.conversations);
    return stages;
  }

  async deleteStage(stage) {
    try {
      await StageModel.deleteOne({ _id: stage.id });
      // await newStage.delete();
      // return newStage;
    } catch (e) {
      console.log(e);
    }
  }

  async updateStage(stage) {
    try {
      await StageModel.updateOne(
        { _id: stage.id },
        { $set: { value: stage.value, label: stage.label, color: stage.color } }
      );
      const newStage = await StageModel.findOne({ _id: stage.id }).populate({
        path: 'conversations',
        populate: [{ path: 'messages' }, { path: 'user' }, { path: 'tasks' }],
      });
      return newStage;
    } catch (e) {
      console.log(e);
    }
  }

  async moveRecordToPosition(position, value) {
    const totalRecords = await StageModel.find();
    console.log(totalRecords.length);
    if (position < 0 || position > totalRecords.length) {
      return;
    }
    // Находим запись с данным value
    const recordToMove = await StageModel.findOne({ value });

    // Проверяем, что запись найдена
    if (!recordToMove) {
      return;
    }
    const currentPosition = recordToMove.position;

    await StageModel.updateOne(
      { position },
      { $set: { position: currentPosition } }
    );

    // Получаем текущую позицию записи
    // Обновляем позицию записи на новую переданную позицию
    recordToMove.position = position;
    await recordToMove.save();
    // Обновляем позиции остальных записей
    // if (currentPosition < position) {
    //   await StageModel.updateMany(
    //     { position: { $gt: currentPosition, $lte: position } },
    //     { $inc: { position: -1 } }
    //   );
    // } else if (currentPosition > position) {
    //   await StageModel.updateMany(
    //     { position: { $gte: position, $lt: currentPosition } },
    //     { $inc: { position: 1 } }
    //   );
    // }
    console.log('Запись успешно перемещена');
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
    const newStage = await StageModel.findOne({ value: value }).populate({
      path: 'conversations',
      populate: [{ path: 'messages' }, { path: 'user' }, { path: 'tasks' }],
    });
    const oldStage = await StageModel.findOne({ _id: oldStageId }).populate({
      path: 'conversations',
      populate: [{ path: 'messages' }, { path: 'user' }, { path: 'tasks' }],
    });

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
    const newTmp = await StageModel.findOne({ value: value }).populate({
      path: 'conversations',
      populate: [{ path: 'messages' }, { path: 'user' }, { path: 'tasks' }],
    });
    const oldTmp = await StageModel.findOne({ _id: oldStageId }).populate({
      path: 'conversations',
      populate: [{ path: 'messages' }, { path: 'user' }, { path: 'tasks' }],
    });
    return { oldTmp, newTmp };
  }
}

module.exports = new StageService();
