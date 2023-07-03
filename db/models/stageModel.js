var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var stageSchema = new Schema({
  label: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: true,
  },
  conversations: [
    {
      type: Schema.Types.ObjectId,
      ref: 'conversation',
    },
  ],
});

const StageModel = mongoose.model('stage', stageSchema);

module.exports = { StageModel };
