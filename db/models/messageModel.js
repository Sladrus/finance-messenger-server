var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var messageSchema = new Schema({
  message_id: {
    type: Number,
  },
  unread: { type: Boolean, required: true, default: true },
  from: {},
  chat: {},
  date: {
    type: Number,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
});

const MessageModel = mongoose.model('message', messageSchema);

module.exports = { MessageModel };
