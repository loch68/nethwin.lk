const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    unique: true,
    default: () => 'MSG_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  },
  senderId: {
    type: String,
    required: true,
    trim: true
  },
  receiverId: {
    type: String,
    required: true,
    trim: true
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  productId: {
    type: String,
    default: null,
    trim: true
  },
  senderName: {
    type: String,
    required: true,
    trim: true
  },
  receiverName: {
    type: String,
    required: true,
    trim: true
  },
  threadId: {
    type: String,
    required: true,
    index: true // For efficient querying of conversation threads
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
ChatMessageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create compound index for efficient thread queries
ChatMessageSchema.index({ threadId: 1, createdAt: 1 });
ChatMessageSchema.index({ senderId: 1, receiverId: 1 });
ChatMessageSchema.index({ status: 1, createdAt: -1 });

// Static method to generate thread ID
ChatMessageSchema.statics.generateThreadId = function(senderId, receiverId) {
  // Sort IDs to ensure consistent thread ID regardless of who sends first
  const sortedIds = [senderId, receiverId].sort();
  return `thread_${sortedIds[0]}_${sortedIds[1]}`;
};

// Static method to get conversation thread
ChatMessageSchema.statics.getThread = function(userId1, userId2) {
  const threadId = this.generateThreadId(userId1, userId2);
  return this.find({ threadId }).sort({ createdAt: 1 });
};

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
