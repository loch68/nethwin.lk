const mongoose = require('mongoose');

const wishlistDataSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  wishlist: [{
    id: String,
    name: String,
    price: Number,
    image: String,
    category: String,
    brand: String,
    addedAt: Date
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('WishlistData', wishlistDataSchema);
