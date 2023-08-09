const { ConversationModel } = require('../models/conversationModel');
const { MessageModel } = require('../models/messageModel');
const { addConversationToStage } = require('./stageService');

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
    const conversationTmp = await ConversationModel.findOne({
      chat_id: chat_id,
    })
      .populate({
        path: 'messages',
      })
      .populate({ path: 'stage' })
      .populate({ path: 'user' });
    // console.log(conversation);
    return conversation;
  }

  async findAllConversations(filter) {
    try {
      const conversations = await ConversationModel.find()
        .sort({ updatedAt: -1 })
        .populate({
          path: 'messages',
        })
        .populate({ path: 'user' })
        .populate({
          path: 'stage',
          select: '-conversations',
        });

      return conversations;
    } catch (error) {
      console.log(error);
    }
  }

  async findOneConversation(filter) {
    const conversation = await ConversationModel.findOne(filter)
      .populate('messages')
      .populate({ path: 'stage' })
      .populate({ path: 'user' });
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
      .populate({ path: 'user' });

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
