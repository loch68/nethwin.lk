const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    reviewId: {
        type: String,
        unique: true,
        default: () => 'REV_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    userName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    userEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        maxlength: 255
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        validate: {
            validator: Number.isInteger,
            message: 'Rating must be an integer between 1 and 5'
        }
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    comment: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'deleted'],
        default: 'pending'
    },
    helpfulVotes: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    approvedAt: {
        type: Date
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

// Update the updatedAt field before saving
ReviewSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    if (this.status === 'approved' && this.isModified('status')) {
        this.approvedAt = new Date();
    }
    next();
});

// Index for better query performance
ReviewSchema.index({ productId: 1, status: 1 });
ReviewSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Review', ReviewSchema);