const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, index: true }, // Username
    fullName: { type: String, required: true }, // Full name

    email: { type: String, required: true, unique: true, index: true }, // Email
    phoneNumber: { type: String, default: '' }, // Phone number

    // Delivery info
    address: { type: String, default: '' }, 
    province: { type: String, default: '' },
    district: { type: String, default: '' },
    city: { type: String, default: '' },
    zipCode: { type: String, default: '' },

    // Account + authentication
    passwordHash: { type: String, required: true }, // Hashed password
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
    role: { type: String, enum: ['admin', 'customer'], default: 'customer' },
    customerType: { type: String, enum: ['online', 'instore'], default: 'online' }, // Customer type for reporting
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
