const mongoose = require('mongoose');

const deliverySettingsSchema = new mongoose.Schema(
  {
    // Delivery pricing
    localDeliveryPrice: { type: Number, default: 0 },
    deliveryRadius: { type: Number, default: 10 }, // in km
    
    // Delivery zones (for future expansion)
    deliveryZones: [{
      name: { type: String, required: true },
      price: { type: Number, required: true },
      radius: { type: Number, required: true }
    }],
    
    // Settings metadata
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Index for efficient queries
deliverySettingsSchema.index({ isActive: 1 });

module.exports = mongoose.model('DeliverySettings', deliverySettingsSchema);
