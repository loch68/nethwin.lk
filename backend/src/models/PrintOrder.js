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
      enum: ['pending', 'in_queue', 'in_progress', 'ready', 'completed', 'cancelled', 'failed'], 
      default: 'pending' 
    },
    priority: { 
      type: String, 
      enum: ['low', 'normal', 'high', 'urgent'], 
      default: 'normal' 
    },
    
    // Queue management
    queuePosition: { type: Number, default: 0 },
    estimatedCompletion: { type: Date },
    actualStartTime: { type: Date },
    actualEndTime: { type: Date },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    
    // Resource assignment
    assignedPrinter: { type: String, default: '' },
    assignedOperator: { type: String, default: '' },
    
    // Pricing (optional for now)
    estimatedPrice: { type: Number, default: 0 },
    finalPrice: { type: Number, default: 0 },
    
    // Delivery information
    deliveryMethod: { type: String, enum: ['pickup', 'delivery'], required: true },
    deliveryAddress: { type: String, default: '' },
    
    // Payment information
    paymentMethod: { 
      type: String, 
      enum: ['Cash on Delivery', 'Card Payment'], 
      required: true 
    },
    
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
printOrderSchema.index({ queuePosition: 1 });
printOrderSchema.index({ priority: 1, createdAt: 1 });
printOrderSchema.index({ status: 1, queuePosition: 1 });

module.exports = mongoose.model('PrintOrder', printOrderSchema);
