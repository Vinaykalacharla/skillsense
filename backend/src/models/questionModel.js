const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['dsa', 'system_design', 'behavioral', 'hr'],
      required: true,
    },
    topic:       { type: String, required: true },
    difficulty:  { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    companies:   { type: [String], default: [] },
    title:       { type: String, required: true },
    description: { type: String, required: true },
    hint:        { type: String, default: '' },
    sample_answer: { type: String, default: '' },
    tags:        { type: [String], default: [] },
    is_seed:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

questionSchema.index({ category: 1, difficulty: 1 });

module.exports = mongoose.model('Question', questionSchema);
