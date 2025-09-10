const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    price: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    unitPurchasePrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    sku: { type: String, index: true },
    brand: { type: String, default: '' },
    category: { type: String, default: '' },
    productType: { type: String, default: 'Single' },
    tax: { type: Number, default: 0 },
    businessLocation: { type: String, default: '' },
    availability: { type: String, enum: ['in_stock', 'low_stock', 'out_of_stock'], default: 'in_stock' },
    currentStock: { type: Number, default: 0 },
    status: { type: String, default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);


