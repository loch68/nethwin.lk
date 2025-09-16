const mongoose = require('mongoose');

const printOrderSchema = new mongoose.Schema(
  {
    // User information (from logged in user)
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    contactNumber: { type: String, required: true },
    email: { type: String, required: true },
    
    // Print specifications
    paperSize: { type: String, required: true },
    colorOption: { type: String, required: true },
    binding: { type: String, required: true },
    copies: { type: Number, required: true, min: 1 },
    finishing: { type: String, required: true },
    additionalNotes: { type: String, default: '' }, // Required only if custom finishing
    
    // Document information
    documentPath: { type: String, required: true },
    originalFileName: { type: String, required: true },
    fileSize: { type: Number, required: true }, // in bytes
    
    // Order management
    status: { 
      type: String, 
      enum: ['pending', 'processing', 'ready', 'completed', 'cancelled'], 
      default: 'pending' 
    },
    priority: { 
      type: String, 
      enum: ['normal', 'urgent', 'rush'], 
      default: 'normal' 
    },
    
    // Pricing (optional for now)
    estimatedPrice: { type: Number, default: 0 },
    finalPrice: { type: Number, default: 0 },
    
    // Delivery information
    deliveryMethod: { type: String, enum: ['pickup', 'delivery'], required: true },
    deliveryAddress: { type: String, default: '' },
    
    // Admin notes
    adminNotes: { type: String, default: '' },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// Index for efficient queries
printOrderSchema.index({ userId: 1, createdAt: -1 });
printOrderSchema.index({ status: 1 });
printOrderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PrintOrder', printOrderSchema);
