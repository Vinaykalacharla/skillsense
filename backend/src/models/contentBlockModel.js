const mongoose = require('mongoose');

const contentBlockSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ContentBlock', contentBlockSchema);
