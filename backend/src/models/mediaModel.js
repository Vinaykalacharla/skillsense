const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    media_type: { type: String, enum: ['video', 'audio'], default: 'video' },
    status: { type: String, enum: ['processing', 'ready'], default: 'processing' },
    path: { type: String, required: true },
    file_size: { type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MediaItem', mediaSchema);
