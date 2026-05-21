const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
  {
    user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    status:   { type: String, enum: ['practiced', 'bookmarked', 'skipped'], default: 'practiced' },
    notes:    { type: String, default: '' },
    practiced_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

progressSchema.index({ user: 1, question: 1 }, { unique: true });

module.exports = mongoose.model('QuestionProgress', progressSchema);
