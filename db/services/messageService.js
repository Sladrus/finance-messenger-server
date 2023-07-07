const { MessageModel } = require('../models/messageModel');
const { findOneConversation } = require('./conversationService');

class MessageService {
  async createMessage(conversationId, msg) {
    const conversation = await findOneConversation({ chat_id: conversationId });
    if (!conversation) {
      return console.log('Конверсация не найдена');
    }
    const message = await MessageModel.create(msg);
    conversation.messages.push(message._id);
    conversation.updatedAt = Date.now();
    await conversation.save();
    return message;
  }
}

module.exports = new MessageService();
