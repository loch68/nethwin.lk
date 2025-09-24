const mongoose = require('mongoose');

const heroImageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  imageUrl: {
    type: String,
    required: true
  },
  mobileImageUrl: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String,
    required: true
  },
  cloudinaryId: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  buttonText: {
    type: String,
    default: 'Shop Now',
    maxlength: 50
  },
  buttonLink: {
    type: String,
    default: '/html/bookshop.html'
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
heroImageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for performance
heroImageSchema.index({ isActive: 1, displayOrder: 1 });
heroImageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('HeroImage', heroImageSchema);
