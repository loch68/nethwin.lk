const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    // Essential fields
    productId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    brand: {
        type: String,
        trim: true
    },
    sellingPrice: {
        type: Number,
        required: true,
        min: 0
    },
    purchasePrice: {
        type: Number,
        required: true,
        min: 0
    },
    stock: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    description: {
        type: String,
        trim: true
    },
    images: [{
        type: String,
        required: true
    }],
    
    // Optional/Secondary fields
    discountPrice: {
        type: Number,
        min: 0
    },
    variants: [{
        size: String,
        color: String
    }],
    status: {
        type: String,
        enum: ['active', 'inactive', 'discontinued'],
        default: 'active'
    },
    ratings: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    reviews: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        userName: {
            type: String,
            required: true
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            trim: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true // This adds createdAt and updatedAt automatically
});

// Index for better query performance
productSchema.index({ category: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ status: 1 });
productSchema.index({ name: 'text', description: 'text' }); // Text search index

module.exports = mongoose.model('Product', productSchema);