require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const { cloudinary, upload: cloudinaryUpload } = require('./src/config/cloudinary');
const { heroUpload } = require('./src/config/hero-cloudinary');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.tailwindcss.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "https://api.qrserver.com", "https://via.placeholder.com", "https://res.cloudinary.com"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));
app.use(morgan('combined'));
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Multer configuration for print order file uploads
const printOrderStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/print-orders/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'print_' + uniqueSuffix + path.extname(file.originalname));
  }
});

const printOrderUpload = multer({
  storage: printOrderStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document formats
    const allowedTypes = /pdf|doc|docx|txt|jpg|jpeg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, TXT, JPG, JPEG, PNG, and GIF files are allowed'));
    }
  }
});

// Use Cloudinary for product image uploads
const productImageUpload = cloudinaryUpload;

// Create uploads/products directory if it doesn't exist
const productsUploadDir = path.join(__dirname, 'uploads', 'products');
if (!fs.existsSync(productsUploadDir)) {
  fs.mkdirSync(productsUploadDir, { recursive: true });
}

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bookstore';
mongoose
  .connect(mongoUri, { 
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err.message));

// Models
const Product = require('./src/models/Product');
const User = require('./src/models/User');
const Order = require('./src/models/Order');
const Review = require('./src/models/Review');
const Message = require('./src/models/Message');
const PrintOrder = require('./src/models/PrintOrder');
const HeroImage = require('./src/models/HeroImage');

// Pricing data
const pricingData = {
  paperSizes: [
    { size: "A6", normal_color: 20, laser_color: 65, bw_single: 5, bw_double: 5 },
    { size: "A5", normal_color: 40, laser_color: 125, bw_single: 5, bw_double: 10 },
    { size: "A4", normal_color: 75, laser_color: 250, bw_single: 5, bw_double: 10 },
    { size: "A3", normal_color: 150, laser_color: 500, bw_single: 10, bw_double: 15 },
    { size: "A2", normal_color: 300, laser_color: 1000, bw_single: 15, bw_double: 30 },
    { size: "A1", normal_color: 600, laser_color: 2000, bw_single: 30, bw_double: 65 }
  ],
  binding: [
    { type: "Spiral Binding", price: 50 },
    { type: "Thermal Binding", price: 150 },
    { type: "Hardcover Binding", price: 500 },
    { type: "Saddle Stitching", price: 30 }
  ],
  finishing: [
    { type: "Lamination (Gloss)", price: 50 },
    { type: "Lamination (Matte)", price: 50 },
    { type: "Foil Stamping", price: 100 },
    { type: "Embossing/Debossing", price: 150 },
    { type: "Die-Cutting", price: 200 }
  ],
  delivery: [
    { type: "Home Delivery", price: 150 },
    { type: "Pickup", price: 0 }
  ]
};

// Pricing calculation function
function calculatePrintPrice(paperSize, colorOption, copies, binding, finishing, deliveryMethod) {
  let totalPrice = 0;
  
  // Find paper size pricing
  const sizeData = pricingData.paperSizes.find(s => s.size === paperSize);
  if (!sizeData) return 0;
  
  // Calculate base print cost
  let printCostPerCopy = 0;
  switch (colorOption) {
    case 'normal_color':
      printCostPerCopy = sizeData.normal_color;
      break;
    case 'laser_color':
      printCostPerCopy = sizeData.laser_color;
      break;
    case 'bw_single':
      printCostPerCopy = sizeData.bw_single;
      break;
    case 'bw_double':
      printCostPerCopy = sizeData.bw_double;
      break;
    default:
      printCostPerCopy = sizeData.normal_color;
  }
  
  totalPrice += printCostPerCopy * copies;
  
  // Add binding cost (skip if "None")
  if (binding && binding !== "None") {
    const bindingData = pricingData.binding.find(b => b.type === binding);
    if (bindingData) {
      totalPrice += bindingData.price;
    }
  }
  
  // Add finishing cost (skip if "None")
  if (finishing && finishing !== "None") {
    const finishingData = pricingData.finishing.find(f => f.type === finishing);
    if (finishingData) {
      totalPrice += finishingData.price;
    }
  }
  
  // Add delivery cost
  const deliveryData = pricingData.delivery.find(d => d.type === deliveryMethod);
  if (deliveryData) {
    totalPrice += deliveryData.price;
  }
  
  return totalPrice;
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// GET /api/products?search=&page=1&limit=20&status=active&includeInactive=false
app.get('/api/products', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const search = (req.query.search || '').trim();
    const status = req.query.status || 'active'; // Default to active for user-facing requests
    const includeInactive = req.query.includeInactive === 'true'; // Admin can include inactive products

    const filters = {};
    
    // Status filtering - by default only show active products unless admin requests all
    if (!includeInactive) {
      filters.status = 'active'; // Always show only active products for user-facing requests
      filters.stock = { $gt: 0 }; // Only show products with stock > 0 for user-facing requests
    } else if (status !== 'all') {
      filters.status = status; // Admin can filter by specific status
    }
    
    // Search filtering
    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { productId: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Product.countDocuments(filters);
    const products = await Product.find(filters)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({ page, limit, total, products });
  } catch (err) {
    console.error('GET /api/products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/:id
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ error: 'Not found' });
    
    // Check if product is active (for user-facing requests)
    const includeInactive = req.query.includeInactive === 'true';
    if (!includeInactive && product.status !== 'active') {
      return res.status(404).json({ error: 'Product not available' });
    }
    
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: 'Invalid id' });
  }
});

// Admin: create product
app.post('/api/products', async (req, res) => {
  try {
    const body = req.body || {};
    console.log('POST /api/products body:', body);
    
    // Validation
    if (!body.productId || !body.name || !body.category || !body.sellingPrice || !body.purchasePrice) {
      return res.status(400).json({ 
        error: 'Missing required fields: productId, name, category, sellingPrice, purchasePrice' 
      });
    }
    
    // Check if productId already exists
    const existingProduct = await Product.findOne({ productId: body.productId });
    if (existingProduct) {
      return res.status(400).json({ error: 'Product ID already exists' });
    }
    
    const created = await Product.create({
      productId: body.productId,
      name: body.name,
      category: body.category,
      brand: body.brand || '',
      sellingPrice: body.sellingPrice,
      purchasePrice: body.purchasePrice,
      stock: body.stock || 0,
      description: body.description || '',
      images: body.images || [],
      discountPrice: body.discountPrice,
      variants: body.variants || [],
      status: body.status || 'active',
      ratings: body.ratings || 0,
      reviews: body.reviews || []
    });
    res.status(201).json(created);
  } catch (err) {
    console.error('POST /api/products error', err);
    res.status(400).json({ error: err?.message || 'Invalid payload' });
  }
});

// Admin: update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const updates = req.body || {};
    console.log('PUT /api/products/:id body:', updates);
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err?.message || 'Invalid id or payload' });
  }
});

// Admin: toggle status
app.patch('/api/products/:id/status', async (req, res) => {
  try {
    const status = req.body?.status;
    if (!status) return res.status(400).json({ error: 'status required' });
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: 'Invalid id or payload' });
  }
});

// Admin: delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id).lean();
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Invalid id' });
  }
});

// Admin: bulk import
app.post('/api/products/import', async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [];
    if (items.length === 0) return res.status(400).json({ error: 'No items' });
    const docs = items.map((p) => ({
      productId: p.productId || p.sku || '',
      name: p.name,
      category: p.category || '',
      brand: p.brand || '',
      sellingPrice: p.sellingPrice || p.price || 0,
      purchasePrice: p.purchasePrice || p.unitPurchasePrice || 0,
      stock: p.stock || p.currentStock || 0,
      description: p.description || '',
      images: p.images || (p.image ? [p.image] : []),
      discountPrice: p.discountPrice || p.discount,
      variants: p.variants || [],
      status: p.status || 'active',
    }));
    const created = await Product.insertMany(docs);
    res.json({ inserted: created.length });
  } catch (err) {
    console.error('POST /api/products/import error', err.message);
    res.status(400).json({ error: 'Import failed' });
  }
});

// Product image upload endpoint using direct Cloudinary upload
app.post('/api/products/upload-image', (req, res) => {
  // Use multer memory storage for direct Cloudinary upload
  const multer = require('multer');
  const upload = multer({ storage: multer.memoryStorage() });
  
  upload.single('image')(req, res, async (err) => {
    try {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ error: 'File upload error: ' + err.message });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: 'No image file uploaded' });
      }
      
      console.log('Uploading to Cloudinary...');
      
      // Upload to Cloudinary directly
      const result = await cloudinary.uploader.upload_stream(
        {
          folder: 'nethwinlk/products',
          transformation: [
            { width: 800, height: 800, crop: 'limit', quality: 'auto' },
            { fetch_format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return res.status(500).json({ error: 'Cloudinary upload failed: ' + error.message });
          }
          
          console.log('Cloudinary upload successful:', result.secure_url);
          res.json({ 
            success: true, 
            imageUrl: result.secure_url,
            publicId: result.public_id,
            originalName: req.file.originalname,
            secureUrl: result.secure_url
          });
        }
      );
      
      result.end(req.file.buffer);
      
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json({ error: 'Failed to upload image: ' + error.message });
    }
  });
});

// Serve product images
app.get('/uploads/products/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', 'products', filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Image not found' });
  }
});

// Users CRUD
app.get('/api/users', async (req, res) => {
  const search = (req.query.search || '').trim();
  const filter = search ? { $or: [ { fullName: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }, { username: { $regex: search, $options: 'i' } } ] } : {};
  const users = await User.find(filter).sort({ createdAt: -1 }).lean();
  res.json({ users });
});
app.post('/api/users', async (req, res) => {
  try {
    const {
      fullName,
      email,
      username,
      phoneNumber,
      password,
      role = 'customer',
      customerType = 'online',
      status = 'active'
    } = req.body || {};

    // Validate required fields
    if (!fullName || !email || !username || !password) {
      return res.status(400).json({ error: 'fullName, email, username, password required' });
    }

    // Check if user already exists
    const existing = await User.findOne({ 
      $or: [{ email }, { username }] 
    }).lean();
    if (existing) {
      return res.status(409).json({ error: 'Email or username already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      fullName,
      email,
      username,
      phoneNumber: phoneNumber || '',
      passwordHash,
      role,
      customerType,
      status
    });

    // Return user without password hash
    const userResponse = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      username: user.username,
      phoneNumber: user.phoneNumber,
      role: user.role,
      customerType: user.customerType,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.status(201).json(userResponse);
  } catch (e) { 
    console.error('User creation error:', e);
    res.status(400).json({ error: e.message }); 
  }
});
app.put('/api/users/:id', async (req, res) => {
  try { const u = await User.findByIdAndUpdate(req.params.id, { $set: req.body || {} }, { new: true }).lean(); if (!u) return res.status(404).json({ error: 'Not found' }); res.json(u); } catch (e) { res.status(400).json({ error: e.message }); }
});
app.patch('/api/users/:id/status', async (req, res) => {
  try { const u = await User.findByIdAndUpdate(req.params.id, { $set: { status: req.body?.status } }, { new: true }).lean(); if (!u) return res.status(404).json({ error: 'Not found' }); res.json(u); } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/users/:id', async (req, res) => {
  try { const del = await User.findByIdAndDelete(req.params.id).lean(); if (!del) return res.status(404).json({ error: 'Not found' }); res.json({ success: true }); } catch (e) { res.status(400).json({ error: e.message }); }
});

// Orders CRUD
app.get('/api/orders', async (req, res) => {
  const type = req.query.type;
  const customerEmail = req.query.customerEmail;
  const filter = {
    ...(type ? { type } : {}),
    ...(customerEmail ? { customerEmail } : {}),
  };
  const orders = await Order.find(filter).sort({ createdAt: -1 }).lean();
  res.json({ orders });
});
app.post('/api/orders', async (req, res) => {
  try {
    const body = req.body || {};
    console.log('POST /api/orders body:', body);
    
    // Generate unique order number
    const orderNumber = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    
    const toCreate = {
      type: body.type || 'shop',
      items: Array.isArray(body.items) ? body.items : [],
      total: typeof body.total === 'number' ? body.total : 0,
      status: body.status || 'pending',
      customerName: body.customerName || '',
      customerEmail: body.customerEmail || '',
      customerPhone: body.customerPhone || '',
      deliveryMethod: body.deliveryMethod || body.meta?.deliveryMethod || 'Local Delivery',
      paymentMethod: body.paymentMethod || body.meta?.paymentMethod || 'Cash on Delivery',
      deliveryAddress: body.deliveryAddress || body.meta?.deliveryAddress || '',
      deliveryFee: body.deliveryFee || body.meta?.deliveryFee || 0,
      orderNumber: orderNumber,
      meta: body.meta || {},
    };
    
    const o = await Order.create(toCreate);
    res.status(201).json(o);
  } catch (e) {
    console.error('POST /api/orders error:', e);
    res.status(400).json({ error: e.message || 'Invalid payload' });
  }
});
app.patch('/api/orders/:id/status', async (req, res) => {
  try { const o = await Order.findByIdAndUpdate(req.params.id, { $set: { status: req.body?.status } }, { new: true }).lean(); if (!o) return res.status(404).json({ error: 'Not found' }); res.json(o); } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/orders/:id', async (req, res) => {
  try { const del = await Order.findByIdAndDelete(req.params.id).lean(); if (!del) return res.status(404).json({ error: 'Not found' }); res.json({ success: true }); } catch (e) { res.status(400).json({ error: e.message }); }
});

// Invoice generation route
app.get('/api/orders/:id/invoice', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Generate invoice data
    const invoiceData = {
      orderNumber: order.orderNumber,
      orderDate: order.createdAt,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      deliveryMethod: order.deliveryMethod,
      paymentMethod: order.paymentMethod,
      deliveryAddress: order.deliveryAddress,
      items: order.items,
      subtotal: order.total - (order.deliveryFee || 0),
      deliveryFee: order.deliveryFee || 0,
      total: order.total,
      status: order.status
    };
    
    res.json({
      success: true,
      data: invoiceData
    });
  } catch (e) {
    console.error('Invoice generation error:', e);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

// Reviews API endpoints
console.log('Registering reviews API endpoints...');

// Test endpoint to verify server is working
app.get('/api/reviews/test', (req, res) => {
  res.json({ message: 'Reviews API is working', timestamp: new Date().toISOString() });
});

// Debug endpoint to list all reviews
app.get('/api/reviews/debug', async (req, res) => {
  try {
    const allReviews = await Review.find({}).lean();
    console.log('All reviews in database:', allReviews);
    res.json({ reviews: allReviews, count: allReviews.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get reviews for a specific product (public)
app.get('/api/reviews/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = 'newest' } = req.query;
    
    console.log('Getting reviews for productId:', productId);
    console.log('Is valid ObjectId:', mongoose.Types.ObjectId.isValid(productId));
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    let sortOrder = { createdAt: -1 };
    
    if (sort === 'oldest') sortOrder = { createdAt: 1 };
    if (sort === 'highest') sortOrder = { rating: -1 };
    if (sort === 'lowest') sortOrder = { rating: 1 };
    
    // Handle both ObjectId and string productId
    let query = {
      // For debugging, let's also include pending reviews
      status: { $in: ['approved', 'pending'] },
      isVisible: true
    };
    
    // Check if productId is a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(productId)) {
      query.productId = new mongoose.Types.ObjectId(productId);
      console.log('Using ObjectId query:', query);
    } else {
      // Fallback to string search (for backward compatibility)
      query.productId = productId;
      console.log('Using string query:', query);
    }
    
    const reviews = await Review.find(query)
    .sort(sortOrder)
    .skip(skip)
    .limit(parseInt(limit))
    .lean();
    
    console.log('Found reviews:', reviews.length);
    console.log('Reviews:', reviews);
    
    const total = await Review.countDocuments(query);
    
    // Calculate average rating
    const avgRating = await Review.aggregate([
      { $match: query },
      { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    
    res.json({
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      averageRating: avgRating[0]?.average || 0,
      totalReviews: avgRating[0]?.count || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit a new review
app.post('/api/reviews', [
  body('productId').isMongoId().withMessage('Valid product ID is required'),
  body('userId').notEmpty().withMessage('User ID is required'),
  body('userName').notEmpty().withMessage('Name is required'),
  body('userEmail').isEmail().withMessage('Valid email is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').notEmpty().withMessage('Title is required'),
  body('comment').notEmpty().withMessage('Comment is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const reviewData = {
      ...req.body,
      status: 'pending',
      isVisible: false
    };
    
    const review = await Review.create(reviewData);
    res.status(201).json(review);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all reviews (admin only)
app.get('/api/reviews', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, productId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let filter = {};
    if (status) filter.status = status;
    if (productId) filter.productId = productId;
    
    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await Review.countDocuments(filter);
    
    res.json({
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update review status (admin only)
app.put('/api/reviews/:id/status', async (req, res) => {
  console.log('PUT /api/reviews/:id/status route hit');
  try {
    const { id } = req.params;
    const { status, isVisible, adminNotes } = req.body;
    
    console.log('Updating review status for ID:', id);
    console.log('Update data:', { status, isVisible, adminNotes });
    
    const updateData = {};
    if (status) updateData.status = status;
    if (typeof isVisible === 'boolean') updateData.isVisible = isVisible;
    if (adminNotes) updateData.adminNotes = adminNotes;
    
    console.log('Final update data:', updateData);
    
    const review = await Review.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    console.log('Updated review:', review);
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    res.json(review);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

console.log('PUT /api/reviews/:id/status route registered');

// Delete review (admin only)
app.delete('/api/reviews/:id', async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Vote on review helpfulness
app.post('/api/reviews/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { helpful } = req.body; // true or false
    
    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    if (helpful) {
      review.helpfulVotes += 1;
    }
    
    await review.save();
    res.json({ success: true, helpfulVotes: review.helpfulVotes });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Contact Messages
app.post('/api/messages', async (req, res) => {
  try {
    console.log('POST /api/messages body:', req.body);
    const { name, email, subject, message } = req.body || {};
    if (!name || !email || !message) return res.status(400).json({ error: 'name, email, message required' });
    const doc = await Message.create({ name, email, subject: subject || '', body: message });
    res.status(201).json(doc);
  } catch (e) { console.error('POST /api/messages error:', e); res.status(400).json({ error: e.message }); }
});
app.get('/api/messages', async (req, res) => {
  const messages = await Message.find({}).sort({ createdAt: -1 }).lean();
  res.json({ messages });
});
// Init email transporter
let transporter;
if (process.env.SMTP_HOST) {
  transporter = require('nodemailer').createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
} else {
  transporter = require('nodemailer').createTransport({ jsonTransport: true });
}

app.post('/api/messages/:id/reply', async (req, res) => {
  try {
    const { reply } = req.body || {};
    const updated = await Message.findByIdAndUpdate(
      req.params.id,
      { $set: { reply: { text: reply, at: new Date() }, status: 'replied' } },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ error: 'Not found' });
    try {
      await transporter.sendMail({
        from: process.env.MAIL_FROM || 'no-reply@nethwinlk.local',
        to: updated.email,
        subject: `Re: ${updated.subject || 'Your message to NethwinLK'}`,
        text: updated.reply?.text || ''
      });
    } catch (mailErr) {
      console.error('Email send error:', mailErr.message);
    }
    res.json(updated);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// AUTH: signup/login and profile
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

app.post('/api/auth/signup', async (req, res) => {
  try {
    // Handle both old and new field names for backward compatibility
    const {
      // New field names from frontend
      Username, FullName, EmailAddress, PhoneNumber, Address, Province, District, City, ZipCode, PasswordHash,
      // Old field names for backward compatibility
      fullName, email, phone, password, username
    } = req.body || {};

    // Use new field names if available, otherwise fall back to old ones
    const usernameValue = Username || username || email?.split('@')[0] || 'user';
    const fullNameValue = FullName || fullName;
    const emailValue = EmailAddress || email;
    const phoneValue = PhoneNumber || phone || '';
    const addressValue = Address || '';
    const provinceValue = Province || '';
    const districtValue = District || '';
    const cityValue = City || '';
    const zipCodeValue = ZipCode || '';
    const passwordValue = PasswordHash || password;

    // Validate required fields
    if (!fullNameValue || !emailValue || !passwordValue) {
      return res.status(400).json({ error: 'fullName, email, password required' });
    }

    // Check if user already exists
    const existing = await User.findOne({ email: emailValue }).lean();
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    // Hash password
    const passwordHash = await require('bcryptjs').hash(passwordValue, 10);

    // Create user with all fields
    const user = await User.create({
      username: usernameValue,
      fullName: fullNameValue,
      email: emailValue,
      phoneNumber: phoneValue,
      address: addressValue,
      province: provinceValue,
      district: districtValue,
      city: cityValue,
      zipCode: zipCodeValue,
      passwordHash: passwordHash,
      status: 'active',
      role: 'customer'
    });

    // Generate JWT token
    const token = require('jsonwebtoken').sign(
      { sub: user._id, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.status(201).json({ 
      token, 
      user: { 
        _id: user._id, 
        fullName: user.fullName, 
        email: user.email, 
        phone: user.phoneNumber, 
        status: user.status 
      } 
    });
  } catch (e) { 
    console.error('Signup error:', e);
    res.status(400).json({ error: e.message }); 
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, username, password } = req.body || {};
    
    // Determine if the input is an email or username
    const isEmail = email && email.includes('@');
    const loginField = isEmail ? email : (username || email);
    
    // Search for user by email or username
    const user = await User.findOne({
      $or: [
        { email: loginField },
        { username: loginField }
      ]
    }).lean();
    
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await require('bcryptjs').compare(password || '', user.passwordHash || '');
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = require('jsonwebtoken').sign({ sub: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      token, 
      user: { 
        _id: user._id, 
        fullName: user.fullName, 
        email: user.email, 
        phone: user.phoneNumber, 
        status: user.status,
        role: user.role
      } 
    });
  } catch (e) { 
    console.error('Login error:', e);
    res.status(400).json({ error: e.message }); 
  }
});

app.get('/api/me', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const payload = require('jsonwebtoken').verify(token, JWT_SECRET);
    const user = await User.findById(payload.sub).lean();
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ 
      user: { 
        _id: user._id, 
        fullName: user.fullName, 
        email: user.email, 
        phoneNumber: user.phoneNumber, 
        phone: user.phoneNumber,
        address: user.address,
        province: user.province,
        district: user.district,
        city: user.city,
        zipCode: user.zipCode,
        status: user.status 
      } 
    });
  } catch (e) { res.status(401).json({ error: 'Unauthorized' }); }
});

app.put('/api/me', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const payload = require('jsonwebtoken').verify(token, JWT_SECRET);
    
    // Allow updating all user fields except password and email
    const updates = {
      fullName: req.body?.fullName,
      phoneNumber: req.body?.phoneNumber,
      address: req.body?.address,
      province: req.body?.province,
      district: req.body?.district,
      city: req.body?.city,
      zipCode: req.body?.zipCode
    };
    
    // Remove undefined values
    Object.keys(updates).forEach(key => {
      if (updates[key] === undefined) {
        delete updates[key];
      }
    });
    
    const updated = await User.findByIdAndUpdate(payload.sub, { $set: updates }, { new: true }).lean();
    res.json({ 
      user: { 
        _id: updated._id, 
        fullName: updated.fullName, 
        email: updated.email, 
        phoneNumber: updated.phoneNumber,
        address: updated.address,
        province: updated.province,
        district: updated.district,
        city: updated.city,
        zipCode: updated.zipCode,
        status: updated.status 
      } 
    });
  } catch (e) { res.status(401).json({ error: 'Unauthorized' }); }
});

app.get('/api/my-orders', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const payload = require('jsonwebtoken').verify(token, JWT_SECRET);
    const user = await User.findById(payload.sub).lean();
    const orders = await Order.find({ customerEmail: user.email }).sort({ createdAt: -1 }).lean();
    res.json({ orders });
  } catch (e) { res.status(401).json({ error: 'Unauthorized' }); }
});

// GET /api/profile - Get current user profile
app.get('/api/profile', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const payload = require('jsonwebtoken').verify(token, JWT_SECRET);
    const user = await User.findById(payload.sub).lean();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.fullName || user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        username: user.username || ''
      }
    });
  } catch (e) { 
    res.status(401).json({ error: 'Unauthorized' }); 
  }
});

// Print Order Routes

// POST /api/print-orders - Submit a new print order
app.post('/api/print-orders', 
  printOrderUpload.single('document'),
  [
    body('userName').notEmpty().withMessage('User name is required'),
    body('contactNumber').notEmpty().withMessage('Contact number is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('paperSize').notEmpty().withMessage('Paper size is required'),
    body('colorOption').notEmpty().withMessage('Color option is required'),
    body('binding').notEmpty().withMessage('Binding is required'),
    body('copies').isInt({ min: 1 }).withMessage('Copies must be at least 1'),
    body('finishing').notEmpty().withMessage('Finishing is required'),
    body('deliveryMethod').notEmpty().withMessage('Delivery method is required'),
    body('deliveryAddress').notEmpty().withMessage('Delivery address is required')
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Document file is required'
        });
      }

      // Validate additionalNotes if finishing is custom
      if (req.body.finishing === 'custom' && !req.body.additionalNotes) {
        return res.status(400).json({
          success: false,
          error: 'Additional notes are required for custom finishing'
        });
      }

      // Calculate estimated price
      const estimatedPrice = calculatePrintPrice(
        req.body.paperSize,
        req.body.colorOption,
        parseInt(req.body.copies),
        req.body.binding,
        req.body.finishing,
        req.body.deliveryMethod
      );

      // Convert delivery method to match schema
      const deliveryMethod = req.body.deliveryMethod === 'Home Delivery' ? 'delivery' : 'pickup';

      // Create print order
      const printOrder = await PrintOrder.create({
        userId: req.body.userId || new mongoose.Types.ObjectId(), // Use provided userId or create new
        userName: req.body.userName,
        contactNumber: req.body.contactNumber,
        email: req.body.email,
        paperSize: req.body.paperSize,
        colorOption: req.body.colorOption,
        binding: req.body.binding,
        copies: parseInt(req.body.copies),
        finishing: req.body.finishing,
        additionalNotes: req.body.additionalNotes || '',
        documentPath: req.file.path,
        originalFileName: req.file.originalname,
        fileSize: req.file.size,
        status: 'pending',
        priority: 'normal',
        estimatedPrice: estimatedPrice,
        finalPrice: 0,
        deliveryMethod: deliveryMethod,
        deliveryAddress: req.body.deliveryAddress,
        adminNotes: ''
      });

      res.status(201).json({
        success: true,
        data: printOrder,
        message: 'Print order submitted successfully'
      });

    } catch (error) {
      console.error('Print order submission error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit print order'
      });
    }
  }
);

// GET /api/admin/print-orders - Get all print orders (Admin)
app.get('/api/admin/print-orders', async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const orders = await PrintOrder.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await PrintOrder.countDocuments(filter);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get print orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch print orders'
    });
  }
});

// PATCH /api/admin/print-orders/:id - Update print order (Admin)
app.patch('/api/admin/print-orders/:id', async (req, res) => {
  try {
    const { estimatedPrice, finalPrice, status, priority, adminNotes } = req.body;
    
    const updateData = {};
    if (estimatedPrice !== undefined) updateData.estimatedPrice = estimatedPrice;
    if (finalPrice !== undefined) updateData.finalPrice = finalPrice;
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

    const updatedOrder = await PrintOrder.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).lean();

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        error: 'Print order not found'
      });
    }

    res.json({
      success: true,
      data: updatedOrder,
      message: 'Print order updated successfully'
    });

  } catch (error) {
    console.error('Update print order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update print order'
    });
  }
});

// GET /api/users/:userId/print-orders - Get user's print orders
app.get('/api/users/:userId/print-orders', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format'
      });
    }

    const filter = { userId: new mongoose.Types.ObjectId(userId) };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const orders = await PrintOrder.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await PrintOrder.countDocuments(filter);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get user print orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user print orders'
    });
  }
});

// GET /api/print-orders/pricing - Get pricing information
app.get('/api/print-orders/pricing', (req, res) => {
  res.json({
    success: true,
    data: pricingData
  });
});

// GET /api/print-orders/:id/document - Get print order document (Admin)
app.get('/api/print-orders/:id/document', async (req, res) => {
  try {
    const order = await PrintOrder.findById(req.params.id).lean();
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Print order not found'
      });
    }

    if (!order.documentPath) {
      return res.status(404).json({
        success: false,
        error: 'No document found for this order'
      });
    }

    const filePath = path.join(__dirname, 'uploads', 'print-orders', path.basename(order.documentPath));
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Document file not found on server'
      });
    }

    // Set appropriate headers for file download
    res.setHeader('Content-Disposition', `inline; filename="${order.originalFileName}"`);
    res.setHeader('Content-Type', getContentType(order.originalFileName));
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve document'
    });
  }
});

// Helper function to get content type based on file extension
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif'
  };
  return contentTypes[ext] || 'application/octet-stream';
}

// Error handling middleware for multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB for documents, 5MB for images.'
      });
    }
  }
  if (error.message.includes('Only PDF, DOC, DOCX, TXT, JPG, JPEG, PNG, and GIF files are allowed')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
  if (error.message.includes('Only JPG, JPEG, PNG, GIF, and WEBP image files are allowed')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
  next(error);
});

// Static hosting for the existing frontend (open /html/index.html)
const projectRoot = path.join(__dirname, '..');
app.use(express.static(projectRoot));

// Member 4 - Print On Demand Routes
app.post('/api/print-jobs', async (req, res) => {
  try {
    const { title, serviceType, quantity, customerName, customerEmail, estimatedPrice } = req.body;
    
    // Create a simple print job object (you can enhance this with a proper model later)
    const printJob = {
      id: Date.now().toString(),
      title,
      serviceType,
      quantity,
      customerName,
      customerEmail,
      estimatedPrice,
      status: 'pending',
      createdAt: new Date()
    };
    
    // In a real app, save to database
    console.log('Print job created:', printJob);
    res.status(201).json({ success: true, printJob });
  } catch (error) {
    res.status(400).json({ error: 'Failed to create print job' });
  }
});

app.get('/api/print-jobs', async (req, res) => {
  try {
    // Return sample print jobs (you can connect to database later)
    const printJobs = [
      { id: '1', title: 'Business Cards', serviceType: 'business-card', status: 'processing', customerName: 'John Doe', estimatedPrice: 25.00 },
      { id: '2', title: 'Marketing Banner', serviceType: 'banner', status: 'ready', customerName: 'Jane Smith', estimatedPrice: 85.00 }
    ];
    res.json({ printJobs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch print jobs' });
  }
});

// Create admin user (run once)
app.post('/api/create-admin', async (req, res) => {
  try {
    const adminExists = await User.findOne({ email: 'admin@nethwin.com' });
    if (adminExists) {
      return res.json({ message: 'Admin already exists' });
    }

    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
    const admin = await User.create({
      fullName: 'Admin User',
      email: 'admin@nethwin.com',
      username: 'admin',
      passwordHash: hashedPassword,
      role: 'admin',
      status: 'active'
    });

    res.json({ message: 'Admin user created successfully', email: process.env.ADMIN_EMAIL || 'admin@nethwin.com', password: 'Check .env file for password' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Member 5 - Admin Dashboard Enhanced Routes
app.get('/api/admin/stats', async (req, res) => {
  try {
    const [userCount, productCount, orderCount] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments()
    ]);

    const revenueResult = await Order.aggregate([
      { $match: { status: { $in: ['delivered', 'completed'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    res.json({
      totalUsers: userCount,
      totalProducts: productCount,
      totalOrders: orderCount,
      totalRevenue: totalRevenue,
      printJobs: 5 // Sample count
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin statistics' });
  }
});

// Hero Images API Routes
app.get('/api/hero-images', async (req, res) => {
  try {
    const heroImages = await HeroImage.find({ isActive: true })
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();
    
    res.json({ success: true, heroImages });
  } catch (error) {
    console.error('Error fetching hero images:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch hero images' });
  }
});

app.post('/api/hero-images', heroUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    const { title, description, buttonText, buttonLink } = req.body;
    
    // Get the highest display order
    const lastImage = await HeroImage.findOne().sort({ displayOrder: -1 });
    const displayOrder = lastImage ? lastImage.displayOrder + 1 : 0;

    const heroImage = new HeroImage({
      title: title || 'New Hero Image',
      description: description || 'Amazing products await you',
      imageUrl: req.file.path,
      mobileImageUrl: req.file.path.replace('/w_1920,h_1080/', '/w_1200,h_675/'),
      thumbnailUrl: req.file.path.replace('/w_1920,h_1080/', '/w_800,h_450/'),
      cloudinaryId: req.file.filename,
      buttonText: buttonText || 'Shop Now',
      buttonLink: buttonLink || '/html/bookshop.html',
      displayOrder
    });

    await heroImage.save();
    res.json({ success: true, heroImage });
  } catch (error) {
    console.error('Error creating hero image:', error);
    res.status(500).json({ success: false, error: 'Failed to create hero image' });
  }
});

app.put('/api/hero-images/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, buttonText, buttonLink, isActive, displayOrder } = req.body;

    const heroImage = await HeroImage.findByIdAndUpdate(
      id,
      { 
        title, 
        description, 
        buttonText, 
        buttonLink, 
        isActive, 
        displayOrder,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!heroImage) {
      return res.status(404).json({ success: false, error: 'Hero image not found' });
    }

    res.json({ success: true, heroImage });
  } catch (error) {
    console.error('Error updating hero image:', error);
    res.status(500).json({ success: false, error: 'Failed to update hero image' });
  }
});

app.delete('/api/hero-images/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const heroImage = await HeroImage.findById(id);

    if (!heroImage) {
      return res.status(404).json({ success: false, error: 'Hero image not found' });
    }

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(heroImage.cloudinaryId);
    } catch (cloudinaryError) {
      console.error('Error deleting from Cloudinary:', cloudinaryError);
    }

    await HeroImage.findByIdAndDelete(id);
    res.json({ success: true, message: 'Hero image deleted successfully' });
  } catch (error) {
    console.error('Error deleting hero image:', error);
    res.status(500).json({ success: false, error: 'Failed to delete hero image' });
  }
});

app.get('/api/admin/hero-images', async (req, res) => {
  try {
    const heroImages = await HeroImage.find({})
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();
    
    res.json({ success: true, heroImages });
  } catch (error) {
    console.error('Error fetching admin hero images:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch hero images' });
  }
});

// MongoDB Connection (using the one defined above)
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB Atlas - bookstore database');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Open frontend at http://localhost:${PORT}/html/index.html`);
  console.log('📚 Enhanced with 5-member functionality:');
  console.log(`   • Member 1 - User Handling: /html/admin-users.html`);
  console.log(`   • Member 2 - Book Listing: /html/bookshop.html`);
  console.log(`   • Member 3 - Cart & Checkout: /html/cart.html`);
  console.log(`   • Member 4 - Print Services: /html/print.html`);
  console.log(`   • Member 5 - Admin Dashboard: /html/admin-dashboard.html`);
});


