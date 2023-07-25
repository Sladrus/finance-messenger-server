var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var stageSchema = new Schema({
  label: {
    type: String,
    required: true,
  },
  default: { type: Boolean, required: true },
  color: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: true,
    unique: true,
  },
  conversations: [
    {
      type: Schema.Types.ObjectId,
      ref: 'conversation',
    },
  ],
});

const StageModel = mongoose.model('stage', stageSchema);

const defaultStages = [
  {
    label: 'Свободные чаты',
    default: true,
    color: 'white',
    value: 'ready',
  },
  {
    label: 'Необработанные чаты',
    default: true,
    color: 'dodgerblue',
    value: 'raw',
  },
  { label: 'В работе', default: true, color: 'gold', value: 'work' },
  {
    label: 'Активированные',
    default: true,
    color: 'limegreen',
    value: 'active',
  },
  {
    label: 'Есть задача',
    default: true,
    color: 'brown',
    value: 'task',
  },
];

StageModel.create(defaultStages).catch((e) => console.log(e));

module.exports = { StageModel };
