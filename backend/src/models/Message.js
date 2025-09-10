const mongoose = require('mongoose');

const ReplySchema = new mongoose.Schema(
  {
    text: { type: String, default: '' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const MessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, default: '' },
    body: { type: String, required: true },
    status: { type: String, enum: ['new', 'replied', 'closed'], default: 'new' },
    reply: { type: ReplySchema, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Message || mongoose.model('Message', MessageSchema);


