const { ConversationModel } = require('../models/conversationModel');
const { MessageModel } = require('../models/messageModel');
const { addConversationToStage } = require('./stageService');

class ConversationService {
  async createConversation(body) {
    const conversation = await ConversationModel.create(body);
    return conversation;
  }

  async findAllConversations() {
    const conversations = await ConversationModel.find()
      .populate({
        path: 'messages',
      })
      .populate({ path: 'stage' });

    conversations.forEach(async (conversation) => {
      conversation.unreadCount = conversation.messages.reduce(
        (count, message) => {
          return message.unread ? count + 1 : count;
        },
        0
      );

      await conversation.save();
    });

    return conversations;
  }

  async findOneConversation(filter) {
    const conversation = await ConversationModel.findOne(filter).populate(
      'messages'
    );
    return conversation;
  }

  async findMessagesByChat(conversationId) {
    const conversation = await ConversationModel.findOne({
      chat_id: Number(conversationId.chat_id),
    }).populate('messages');
    if (!conversation) {
      return console.log('Конверсация не найдена');
    }
    return conversation?.messages;
  }

  async readConversation(chatId) {
    const conversation = await ConversationModel.findOne({
      chat_id: chatId,
    }).populate('messages');

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

      // Save the updated conversation
      await conversation.save();
    }

    return conversation;
  }
}

module.exports = new ConversationService();
