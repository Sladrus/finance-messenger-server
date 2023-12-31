const { ConversationModel } = require('../models/conversationModel');
const { MessageModel } = require('../models/messageModel');
const { StageModel } = require('../models/stageModel');
const { TagModel } = require('../models/tagModel');
const { TaskModel } = require('../models/taskModel');
const { addConversationToStage, findStageByValue } = require('./stageService');

class ConversationService {
  async createConversation(body) {
    const conversation = await ConversationModel.create(body);
    return conversation;
  }

  async updateConversation(id, body) {
    console.log(body);
    const conversation = await ConversationModel.updateOne(
      { _id: id },
      { $set: { ...body } }
    );
    return conversation;
  }

  async changeuserConversation(chat_id, user) {
    console.log(chat_id, user);
    const conversation = await ConversationModel.findOne({
      chat_id: chat_id,
    }).populate({ path: 'user' });

    await ConversationModel.updateOne(
      { chat_id: chat_id },
      { $set: { user: user ? user?._id : null } }
    );
    // const conversationTmp = await ConversationModel.findOne({
    //   chat_id: chat_id,
    // })
    //   .populate({
    //     path: 'messages',
    //   })
    //   .populate({ path: 'stage' })
    //   .populate({ path: 'user' });
    // // console.log(conversation);
    return conversation;
  }

  async linkConversation(chat_id, user) {
    console.log(chat_id, user);
    const conversation = await ConversationModel.findOne({ chat_id: chat_id });

    console.log(conversation);

    await ConversationModel.updateOne(
      { chat_id: chat_id },
      { $set: { user: conversation?.user ? null : user?._id } }
    );
    // const conversationTmp = await ConversationModel.findOne({
    //   chat_id: chat_id,
    // })
    //   .populate({
    //     path: 'messages',
    //   })
    //   .populate({ path: 'stage' })
    //   .populate({ path: 'user' })
    //   .populate('tasks');
    // console.log(conversation);
    return conversation;
  }

  async findAllConversations(page, limit, searchInput, filter, dateRange) {
    try {
      console.log(filter, dateRange);
      const query = {
        title: { $regex: searchInput, $options: 'i' },
      };

      if (filter?.stage) {
        const stage = await StageModel.findOne({ value: filter.stage });
        console.log(stage._id);
        query['stage'] = stage._id;
      }

      if (filter?.user === null) {
        query['user'] = null;
      } else if (filter?.user) {
        query['user'] = filter.user;
      }

      if (filter?.unread !== '') {
        const unread = filter.unread === true ? { $gt: 0 } : { $eq: 0 };
        query['unreadCount'] = unread;
      }

      const startDate = new Date(dateRange[0].startDate);
      // startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateRange[0].endDate);
      // endDate.setHours(23, 59, 59, 0);

      query['workAt'] = {
        $gte: startDate,
        $lte: endDate,
      };

      const count = await ConversationModel.countDocuments(query);

      const conversations = await ConversationModel.find(query)
        .sort({ updatedAt: -1 })
        .limit(page * limit)
        .populate({
          path: 'messages',
        })
        .populate({ path: 'user' })
        .populate({
          path: 'stage',
          select: '-conversations',
        })
        .populate({ path: 'tasks' })
        .populate({ path: 'tags' });

      return { conversations, count };
    } catch (error) {
      console.log(error);
    }
  }

  async findAllTasks() {
    const tasks = await TaskModel.find().populate({ path: 'conversation' });
    return tasks;
  }

  async findAllTags() {
    const tags = await TagModel.find();
    return tags;
  }

  async createTasks(data, chat_id) {
    // console.log(data);
    const conversation = await ConversationModel.findOne({
      chat_id: chat_id,
    }).populate({ path: 'tasks' });

    const task = await TaskModel.create({
      text: data.text,
      conversation: conversation._id,
      endAt: data.endAt,
      createdAt: data.createdAt,
    });

    if (!conversation?.tasks) {
      conversation.tasks = [];
    }
    conversation.tasks.push(task);
    await conversation.save();
    console.log(conversation);

    return task;
  }

  async addTag(value, chat_id) {
    const conversation = await ConversationModel.findOne({
      chat_id: chat_id,
    }).populate({ path: 'tags' });
    if (!conversation?.tags?.includes(value)) {
      const task = await TagModel.findOne({
        value,
      });
      task?.conversations?.push(conversation._id);
      conversation?.tags?.push(task._id);
      await conversation.save();
      await task.save();
      return task;
    }
  }

  async removeTag(value, chat_id) {
    const conversation = await ConversationModel.findOne({
      chat_id: chat_id,
    }).populate({ path: 'tags' });

    const task = await TagModel.findOne({
      value,
    });
    // Remove the conversation from the task's conversations array
    task.conversations = task.conversations.filter(
      (conv) => conv._id.toString() !== conversation._id.toString()
    );

    // Remove the tag from the conversation's tags array
    conversation.tags = conversation.tags.filter(
      (tag) => tag._id.toString() !== task._id.toString()
    );

    await conversation.save();
    await task.save();

    return task;
  }

  async createTag(value, chat_id) {
    const createdTask = await TagModel.create({
      value,
    });
    return createdTask;
  }

  async findOneConversation(filter) {
    const conversation = await ConversationModel.findOne(filter)
      .populate('messages')
      .populate({ path: 'stage' })
      .populate({ path: 'user' })
      .populate({ path: 'tasks' })
      .populate({ path: 'tags' });
    // conversation.unreadCount = conversation?.messages.reduce(
    //   (count, message) => {
    //     return message.unread ? count + 1 : count;
    //   },
    //   0
    // );

    // await conversation.save();
    return conversation;
  }

  async findMessagesByChat(conversationId) {
    console.log(conversationId);
    if (!conversationId.chat_id) return;
    const conversation = await ConversationModel.findOne({
      chat_id: conversationId.chat_id,
    }).populate('messages');
    if (!conversation) {
      return console.log('Конверсация не найдена');
    }
    return conversation?.messages;
  }

  async readConversation(chatId) {
    const conversation = await ConversationModel.findOne({
      chat_id: chatId,
    })
      .populate('messages')
      .populate({ path: 'stage' })
      .populate({ path: 'user' })
      .populate({ path: 'tasks' })
      .populate({ path: 'tags' });

    if (conversation) {
      // Get all messages in the conversation
      const messages = conversation.messages;

      // Prepare the array of message ids to update
      const messageIds = messages.map((message) => message._id);

      // Update all messages in the conversation
      await MessageModel.updateMany(
        { _id: { $in: messageIds } },
        { unread: false }
      );
      conversation.unreadCount = 0;
      // Save the updated conversation
      await conversation.save();
      return conversation;
    }

    return conversation;
  }
}

module.exports = new ConversationService();
