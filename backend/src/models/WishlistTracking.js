const mongoose = require('mongoose');

const wishlistTrackingSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  productId: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    enum: ['add', 'remove'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  productData: {
    name: String,
    price: Number,
    category: String,
    brand: String,
    image: String
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
wishlistTrackingSchema.index({ productId: 1, action: 1 });
wishlistTrackingSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('WishlistTracking', wishlistTrackingSchema);
