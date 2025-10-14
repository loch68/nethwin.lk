const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    price: Number,
    quantity: Number,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['shop', 'print'], required: true },
    items: { type: [orderItemSchema], default: [] },
    total: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
    customerName: { type: String, default: '' },
    customerEmail: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
    deliveryMethod: { type: String, enum: ['Local Delivery', 'Store Pickup'], default: 'Local Delivery' },
    paymentMethod: { type: String, enum: ['Cash on Delivery', 'Card Payment', 'QR Payment'], default: 'Cash on Delivery' },
    giftOption: { type: String, enum: ['self', 'gift'], default: 'self' },
    recipientName: { type: String, default: '' },
    recipientEmail: { type: String, default: '' },
    recipientPhone: { type: String, default: '' },
    giftMessage: { type: String, default: '' },
    deliveryAddress: { type: String, default: '' },
    deliveryFee: { type: Number, default: 0 },
    orderNumber: { type: String, unique: true },
    meta: { type: Object, default: {} },
    // Cancellation tracking (soft delete)
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, default: '' },
    cancelledBy: { type: String, default: '' }, // 'customer' or 'admin'
  },
  { timestamps: true }
);

// Method to check if order can be cancelled (within 24 hours)
orderSchema.methods.canBeCancelled = function() {
  if (this.status === 'cancelled' || this.status === 'delivered') {
    return false;
  }
  const hoursSinceCreation = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceCreation <= 24;
};

// Index for efficient queries
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ customerEmail: 1 });
orderSchema.index({ orderNumber: 1 });

module.exports = mongoose.model('Order', orderSchema);


