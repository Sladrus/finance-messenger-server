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

  async linkConversation(chat_id, user) {
    console.log(chat_id, user);
    const conversation = await ConversationModel.findOne({ chat_id: chat_id });
    console.log(conversation);

    await ConversationModel.updateOne(
      { chat_id: chat_id },
      { $set: { user: conversation?.user ? null : user?._id } }
    );
    // console.log(conversation);
    return conversation;
  }

  async findAllConversations(filter) {
    try {
      // console.log(filter);
      const conversations = await ConversationModel.find()
        .sort({ updatedAt: -1 })
        .populate({
          path: 'messages',
        })
        .populate({ path: 'stage' })
        .populate({ path: 'user' });

      conversations.forEach(async (conversation) => {
        conversation.unreadCount = conversation.messages.reduce(
          (count, message) => {
            return message.unread ? count + 1 : count;
          },
          0
        );

        await conversation.save();
      });

      // var filteredConversations = conversations.filter((conversation) => {
      //   // Check if the conversation's stage has a specific value
      //   return (
      //     conversation?.stage && conversation.stage.value === filter?.stage
      //   );
      // });
      // // console.log(filteredConversations);

      // filteredConversations = filteredConversations.filter((conversation) => {
      //   // Check if the conversation's stage has a specific value
      //   // console.log(conversation.user._id, filter?.user, 'TYT');
      //   return (
      //     conversation?.user &&
      //     conversation.user._id.toString() === filter?.user
      //   );
      // });
      // console.log(filteredConversations);

      return conversations;
    } catch (error) {
      console.log(error);
    }
  }

  async findOneConversation(filter) {
    const conversation = await ConversationModel.findOne(filter).populate(
      'messages'
    );
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
      return;
    }

    return conversation;
  }
}

module.exports = new ConversationService();
