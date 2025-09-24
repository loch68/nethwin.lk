require('dotenv').config({ path: '../.env' });
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
const XLSX = require('xlsx');
const yauzl = require('yauzl');

const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
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
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

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
const DeliverySettings = require('./src/models/DeliverySettings');

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
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 1000);
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

// Bulk delete endpoint (must be before /:id route to avoid conflicts)
app.delete('/api/products/bulk-delete', async (req, res) => {
  try {
    console.log('Bulk delete request received');
    
    // Check if Cloudinary is configured
    const isCloudinaryConfigured = process.env.CLOUDINARY_URL || 
                                   (process.env.CLOUDINARY_CLOUD_NAME && 
                                    process.env.CLOUDINARY_CLOUD_NAME !== 'your-cloudinary-cloud-name' &&
                                    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
                                    process.env.CLOUDINARY_API_KEY && 
                                    process.env.CLOUDINARY_API_KEY !== 'your-cloudinary-api-key' &&
                                    process.env.CLOUDINARY_API_KEY !== 'your_api_key' &&
                                    process.env.CLOUDINARY_API_SECRET && 
                                    process.env.CLOUDINARY_API_SECRET !== 'your-cloudinary-api-secret' &&
                                    process.env.CLOUDINARY_API_SECRET !== 'your_api_secret');
    
    // Get all products to delete
    const products = await Product.find({});
    const totalProducts = products.length;
    
    // Also delete all images from nethwinlk/products folder in Cloudinary
    let cloudinaryFolderDeleted = 0;
    if (isCloudinaryConfigured) {
      try {
        console.log('Deleting all images from nethwinlk/products folder in Cloudinary...');
        const result = await cloudinary.api.delete_resources_by_prefix('nethwinlk/products');
        cloudinaryFolderDeleted = result.deleted ? Object.keys(result.deleted).length : 0;
        console.log(`✅ Deleted ${cloudinaryFolderDeleted} images from Cloudinary folder`);
      } catch (cloudinaryError) {
        console.error('❌ Failed to delete Cloudinary folder:', cloudinaryError.message);
      }
    }
    
    if (totalProducts === 0) {
      return res.json({
        success: true,
        data: {
          deletedProducts: 0,
          deletedImages: cloudinaryFolderDeleted,
          cloudinaryFolderDeleted: cloudinaryFolderDeleted,
          message: 'No products to delete, but cleaned up Cloudinary folder'
        }
      });
    }
    
    console.log(`Found ${totalProducts} products to delete`);
    
    let deletedProducts = 0;
    let deletedImages = 0;
    const errors = [];
    
    // Delete each product and its images
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      try {
        // Delete images from Cloudinary if configured
        if (isCloudinaryConfigured && product.images && product.images.length > 0) {
          for (const imageUrl of product.images) {
            try {
              // Extract public ID from Cloudinary URL
              // URL format: https://res.cloudinary.com/dz6bntmc6/image/upload/v1234567890/nethwinlk/products/abc123.jpg
              const urlParts = imageUrl.split('/');
              const cloudinaryIndex = urlParts.findIndex(part => part === 'image' || part === 'upload');
              
              if (cloudinaryIndex !== -1 && cloudinaryIndex + 3 < urlParts.length) {
                // Get the path after 'upload' (skip version if present)
                const pathParts = urlParts.slice(cloudinaryIndex + 2);
                const fullPublicId = pathParts.join('/').replace(/\.[^/.]+$/, ''); // Remove file extension
                
                console.log(`Attempting to delete Cloudinary image: ${fullPublicId} from URL: ${imageUrl}`);
                await cloudinary.uploader.destroy(fullPublicId);
                deletedImages++;
                console.log(`✅ Successfully deleted image: ${fullPublicId}`);
              } else {
                console.error(`❌ Could not parse Cloudinary URL: ${imageUrl}`);
                errors.push(`Could not parse Cloudinary URL for ${product.name}: ${imageUrl}`);
              }
            } catch (imageError) {
              console.error(`❌ Failed to delete image ${imageUrl}:`, imageError.message);
              errors.push(`Failed to delete image for ${product.name}: ${imageError.message}`);
            }
          }
        }
        
        // Delete product from database
        await Product.findByIdAndDelete(product._id);
        deletedProducts++;
        console.log(`Deleted product: ${product.name} (${product.productId})`);
        
      } catch (error) {
        console.error(`Failed to delete product ${product.name}:`, error.message);
        errors.push(`Failed to delete ${product.name}: ${error.message}`);
      }
    }
    
    console.log(`Bulk delete completed: ${deletedProducts} products, ${deletedImages} images, ${cloudinaryFolderDeleted} from Cloudinary folder`);
    
    res.json({
      success: true,
      data: {
        deletedProducts,
        deletedImages,
        cloudinaryFolderDeleted,
        totalProducts,
        errors: errors.length > 0 ? errors : undefined
      }
    });
    
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Bulk delete failed: ' + error.message
    });
  }
});

// Admin: delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    // First, get the product to access its images
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Not found' });
    
    // Check if Cloudinary is configured
    const isCloudinaryConfigured = process.env.CLOUDINARY_URL || 
                                   (process.env.CLOUDINARY_CLOUD_NAME && 
                                    process.env.CLOUDINARY_CLOUD_NAME !== 'your-cloudinary-cloud-name' &&
                                    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
                                    process.env.CLOUDINARY_API_KEY && 
                                    process.env.CLOUDINARY_API_KEY !== 'your-cloudinary-api-key' &&
                                    process.env.CLOUDINARY_API_KEY !== 'your_api_key' &&
                                    process.env.CLOUDINARY_API_SECRET && 
                                    process.env.CLOUDINARY_API_SECRET !== 'your-cloudinary-api-secret' &&
                                    process.env.CLOUDINARY_API_SECRET !== 'your_api_secret');
    
    // Delete images from Cloudinary if configured
    let deletedImages = 0;
    if (isCloudinaryConfigured && product.images && product.images.length > 0) {
      for (const imageUrl of product.images) {
        try {
          // Extract public ID from Cloudinary URL
          // URL format: https://res.cloudinary.com/dz6bntmc6/image/upload/v1234567890/nethwinlk/products/abc123.jpg
          const urlParts = imageUrl.split('/');
          const cloudinaryIndex = urlParts.findIndex(part => part === 'image' || part === 'upload');
          
          if (cloudinaryIndex !== -1 && cloudinaryIndex + 3 < urlParts.length) {
            // Get the path after 'upload' (skip version if present)
            const pathParts = urlParts.slice(cloudinaryIndex + 2);
            const fullPublicId = pathParts.join('/').replace(/\.[^/.]+$/, ''); // Remove file extension
            
            console.log(`Attempting to delete Cloudinary image: ${fullPublicId} from URL: ${imageUrl}`);
            await cloudinary.uploader.destroy(fullPublicId);
            deletedImages++;
            console.log(`✅ Successfully deleted image: ${fullPublicId}`);
          } else {
            console.error(`❌ Could not parse Cloudinary URL: ${imageUrl}`);
          }
        } catch (imageError) {
          console.error(`❌ Failed to delete image ${imageUrl}:`, imageError.message);
        }
      }
    }
    
    // Delete product from database
    await Product.findByIdAndDelete(req.params.id);
    console.log(`Deleted product: ${product.name} (${product.productId}) with ${deletedImages} images from Cloudinary`);
    
    res.json({ 
      success: true, 
      message: `Product deleted successfully. Removed ${deletedImages} images from Cloudinary.`,
      deletedImages 
    });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(400).json({ error: 'Invalid id or deletion failed' });
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

// Product image upload endpoint with Cloudinary fallback to local storage
app.post('/api/products/upload-image', (req, res) => {
  // Use multer memory storage for upload
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
      
      // Check if Cloudinary is properly configured
      const isCloudinaryConfigured = process.env.CLOUDINARY_URL || 
                                   (process.env.CLOUDINARY_CLOUD_NAME && 
                                    process.env.CLOUDINARY_CLOUD_NAME !== 'your-cloudinary-cloud-name' &&
                                    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
                                    process.env.CLOUDINARY_API_KEY && 
                                    process.env.CLOUDINARY_API_KEY !== 'your-cloudinary-api-key' &&
                                    process.env.CLOUDINARY_API_KEY !== 'your_api_key' &&
                                    process.env.CLOUDINARY_API_SECRET && 
                                    process.env.CLOUDINARY_API_SECRET !== 'your-cloudinary-api-secret' &&
                                    process.env.CLOUDINARY_API_SECRET !== 'your_api_secret');
      
      if (isCloudinaryConfigured) {
        // Upload to Cloudinary
        console.log('Uploading to Cloudinary...');
        
        const result = await cloudinary.uploader.upload(`data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`, {
          folder: 'nethwinlk/products',
          transformation: [
            { width: 800, height: 800, crop: 'limit', quality: 'auto' },
            { fetch_format: 'auto' }
          ]
        });
        
        console.log('Cloudinary upload successful:', result.secure_url);
        res.json({ 
          success: true, 
          imageUrl: result.secure_url,
          publicId: result.public_id,
          originalName: req.file.originalname,
          secureUrl: result.secure_url
        });
      } else {
        // Fallback to local file storage
        console.log('Cloudinary not configured, using local storage...');
        
        // Create products directory if it doesn't exist
        const productsDir = path.join(__dirname, 'uploads', 'products');
        if (!fs.existsSync(productsDir)) {
          fs.mkdirSync(productsDir, { recursive: true });
        }
        
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = 'product_' + uniqueSuffix + path.extname(req.file.originalname);
        const filepath = path.join(productsDir, filename);
        
        // Save file locally
        fs.writeFileSync(filepath, req.file.buffer);
        
        // Return local URL
        const localUrl = `/uploads/products/${filename}`;
        console.log('Local upload successful:', localUrl);
        
        res.json({ 
          success: true, 
          imageUrl: localUrl,
          publicId: filename,
          originalName: req.file.originalname,
          secureUrl: localUrl
        });
      }
      
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

// Serve hero images
app.get('/uploads/hero-images/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', 'hero-images', filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Hero image not found' });
  }
});

// Process Excel and ZIP files for bulk upload
app.post('/api/products/process-bulk-files', async (req, res) => {
  try {
    console.log('🚀 BULK UPLOAD STARTED - Processing bulk files...');
    console.log('Request body size:', JSON.stringify(req.body).length, 'characters');
    console.log('Request body keys:', Object.keys(req.body));
    
    const { excelData, zipData } = req.body;
    
    console.log('Excel data length:', excelData ? excelData.length : 'No excelData');
    console.log('ZIP data length:', zipData ? zipData.length : 'No zipData');
    
    if (!excelData || !zipData) {
      return res.status(400).json({ error: 'Both Excel and ZIP data are required' });
    }

    console.log('Excel data length:', excelData.length);
    console.log('ZIP data length:', zipData.length);

    // Parse Excel data
    console.log('Starting Excel parsing...');
    console.log('Excel data type:', typeof excelData);
    console.log('Excel data length:', excelData.length);
    console.log('First 100 chars of Excel data:', excelData.substring(0, 100));
    
    let workbook;
    try {
      workbook = XLSX.read(excelData, { type: 'buffer' });
      console.log('Workbook created successfully');
      console.log('Sheet names:', workbook.SheetNames);
    } catch (error) {
      console.error('Error creating workbook:', error);
      throw error;
    }
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Debug: Check worksheet structure
    console.log('Worksheet keys:', Object.keys(worksheet));
    console.log('Worksheet range:', worksheet['!ref']);
    console.log('Worksheet rows:', worksheet['!rows']);
    console.log('Worksheet cols:', worksheet['!cols']);
    
        // Try different parsing options
        let products = XLSX.utils.sheet_to_json(worksheet, { 
          header: 0, // Use first row as data (not headers)
          defval: '', // Default value for empty cells
          raw: false // Parse values
        });
        
        console.log('Raw products array (header: 0):', products);
        console.log('Products length:', products.length);
        console.log('First product type:', typeof products[0]);
        console.log('First product is array:', Array.isArray(products[0]));
        
        // Check if we got proper objects (which is what we want with header: 0)
        if (products.length > 0 && typeof products[0] === 'object' && !Array.isArray(products[0])) {
          console.log('✅ Got proper objects with header: 0 - this is correct!');
          console.log('First product:', products[0]);
          console.log('Product keys:', Object.keys(products[0]));
          console.log('✅ Excel parsing successful - products will be processed');
        } else {
          console.log('❌ Did not get proper objects with header: 0');
          console.log('Products length:', products.length);
          console.log('First product type:', typeof products[0]);
          console.log('First product is array:', Array.isArray(products[0]));
          console.log('First product:', products[0]);
        }
        
        // Check if we got binary data instead of proper data
        if (products.length > 0 && Array.isArray(products[0]) && products[0].every(item => typeof item === 'string' && item.startsWith('\x00'))) {
          console.log('❌ Detected binary data - Excel file format issue!');
          console.log('💡 This usually means the Excel file has encoding problems');
          console.log('🔧 Trying alternative parsing methods...');
          
          // Don't force return empty array - try alternative methods first
          console.log('🔧 Trying alternative parsing methods instead of skipping...');
          
          // Try different parsing approaches
          try {
            // Method 1: Try CSV parsing
            console.log('Trying CSV parsing...');
            const csvData = XLSX.utils.sheet_to_csv(worksheet);
            console.log('CSV data length:', csvData.length);
            console.log('CSV data preview:', csvData.substring(0, 500));
            
            if (csvData.length > 0) {
              const lines = csvData.split('\n').filter(line => line.trim().length > 0);
              console.log('CSV lines count:', lines.length);
              
              if (lines.length > 1) {
                const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                console.log('CSV headers:', headers);
                
                products = lines.slice(1).map(line => {
                  const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
                  const product = {};
                  headers.forEach((header, index) => {
                    if (header && header.length > 0) {
                      product[header] = values[index] || '';
                    }
                  });
                  return product;
                });
                
                console.log('Parsed from CSV - first product:', products[0]);
              }
            }
          } catch (csvError) {
            console.log('CSV parsing failed:', csvError);
          }
          
          // Method 2: Try different XLSX options
          if (products.length === 0 || (products.length > 0 && Array.isArray(products[0]) && products[0].every(item => typeof item === 'string' && item.startsWith('\x00')))) {
            console.log('Trying different XLSX parsing options...');
            try {
              // Try with different options
              products = XLSX.utils.sheet_to_json(worksheet, { 
                header: 0,
                defval: '',
                raw: true, // Try raw parsing
                blankrows: false
              });
              console.log('Raw parsing result:', products.slice(0, 3));
            } catch (rawError) {
              console.log('Raw parsing failed:', rawError);
            }
          }
          
          // Method 3: Try to manually extract data from worksheet
          if (products.length === 0 || (products.length > 0 && Array.isArray(products[0]) && products[0].every(item => typeof item === 'string' && item.startsWith('\x00')))) {
            console.log('Trying manual worksheet extraction...');
            try {
              // Get the range of the worksheet
              const range = XLSX.utils.decode_range(worksheet['!ref']);
              console.log('Worksheet range:', range);
              
              // Extract data manually
              const manualData = [];
              for (let row = range.s.r; row <= Math.min(range.s.r + 10, range.e.r); row++) {
                const rowData = [];
                for (let col = range.s.c; col <= range.e.c; col++) {
                  const cellAddress = XLSX.utils.encode_cell({r: row, c: col});
                  const cell = worksheet[cellAddress];
                  if (cell) {
                    rowData.push(cell.v);
                  } else {
                    rowData.push('');
                  }
                }
                manualData.push(rowData);
              }
              
              console.log('Manual extraction - first few rows:', manualData.slice(0, 3));
              
              // Look for header row
              let headerRowIndex = -1;
              for (let i = 0; i < manualData.length; i++) {
                const row = manualData[i];
                const hasTextHeaders = row.some(cell => 
                  typeof cell === 'string' && 
                  cell.toLowerCase().includes('name') || 
                  cell.toLowerCase().includes('category') || 
                  cell.toLowerCase().includes('price')
                );
                if (hasTextHeaders) {
                  headerRowIndex = i;
                  console.log(`Found header row at index ${i}:`, row);
                  break;
                }
              }
              
              if (headerRowIndex >= 0) {
                const headerRow = manualData[headerRowIndex];
                const dataRows = manualData.slice(headerRowIndex + 1);
                
                products = dataRows.map(row => {
                  const product = {};
                  headerRow.forEach((header, index) => {
                    if (header && typeof header === 'string' && header.trim().length > 0) {
                      product[header.trim()] = row[index] || '';
                    }
                  });
                  return product;
                });
                
                console.log('Manual extraction - first product:', products[0]);
              }
            } catch (manualError) {
              console.log('Manual extraction failed:', manualError);
            }
          }
        }
        
        // If no products or we got arrays instead of objects, try with header: 1
        if (products.length === 0 || (products.length > 0 && Array.isArray(products[0]))) {
          console.log('Got arrays instead of objects, trying with header: 1...');
          products = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, // Use first row as headers
            defval: '', 
            raw: false 
          });
          console.log('Products with header: 1:', products);
          
          // If we got arrays, we need to convert them to objects
          if (products.length > 0 && Array.isArray(products[0])) {
            console.log('Converting arrays to objects...');
            const headers = products[0]; // First row should be headers
            const dataRows = products.slice(1); // Rest should be data
            
            products = dataRows.map(row => {
              const product = {};
              headers.forEach((header, index) => {
                if (header && typeof header === 'string' && header.trim().length > 0) {
                  product[header.trim()] = row[index] || '';
                }
              });
              return product;
            });
            
            console.log('Converted to objects - first product:', products[0]);
          }
        }
    
        console.log('🔍 EXCEL PARSING RESULTS:');
        console.log('Number of products found:', products.length);
        console.log('Products type:', typeof products);
        console.log('Products is array:', Array.isArray(products));
        if (products.length > 0) {
          console.log('✅ SUCCESS: First product sample:', products[0]);
          console.log('First product type:', typeof products[0]);
          console.log('First product is array:', Array.isArray(products[0]));
          console.log('Column headers:', Object.keys(products[0] || {}));
        } else {
          console.log('❌ NO PRODUCTS FOUND - This is the problem!');
          console.log('Raw products array:', products);
        }
          
        // Check if we have proper product data
        const firstProduct = products[0];
        if (firstProduct && typeof firstProduct === 'object') {
          const hasName = firstProduct.name || firstProduct.Name || firstProduct.NAME;
          const hasCategory = firstProduct.category || firstProduct.Category || firstProduct.CATEGORY;
          const hasPrice = firstProduct.price || firstProduct.Price || firstProduct.PRICE || firstProduct.sellingPrice || firstProduct.SellingPrice;
          
          console.log('Product validation:');
          console.log('- Has name field:', !!hasName, hasName);
          console.log('- Has category field:', !!hasCategory, hasCategory);
          console.log('- Has price field:', !!hasPrice, hasPrice);
          console.log('- All keys:', Object.keys(firstProduct));
        }
        
        if (products.length === 0) {
          console.log('❌ No products found in Excel file!');
          console.log('🔍 This could be due to:');
          console.log('   1. Excel file format issues (try saving as .xlsx)');
          console.log('   2. Empty rows or missing data');
          console.log('   3. Column headers not in first row');
          console.log('   4. File encoding problems');
          console.log('Raw worksheet data:', worksheet);
          console.log('Sheet names:', workbook.SheetNames);
          console.log('First few rows of raw data:');
          if (worksheet && worksheet['!ref']) {
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            for (let row = range.s.r; row <= Math.min(range.s.r + 3, range.e.r); row++) {
              const rowData = {};
              for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({r: row, c: col});
                const cell = worksheet[cellAddress];
                if (cell) {
                  const headerCell = XLSX.utils.encode_cell({r: range.s.r, c: col});
                  const header = worksheet[headerCell];
                  if (header) {
                    rowData[header.v] = cell.v;
                  }
                }
              }
              console.log(`Row ${row}:`, rowData);
            }
          }
        }

    // Process ZIP file to extract images
    const images = {};
    
    return new Promise((resolve, reject) => {
      console.log('Creating ZIP buffer from base64 data...');
      const zipBuffer = Buffer.from(zipData, 'base64');
      console.log('ZIP buffer size:', zipBuffer.length);
      
      yauzl.fromBuffer(zipBuffer, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          console.error('ZIP parsing error:', err.message);
          console.error('ZIP buffer first 100 bytes:', zipBuffer.slice(0, 100));
          console.error('ZIP buffer last 100 bytes:', zipBuffer.slice(-100));
          reject(err);
          return;
        }

        zipfile.readEntry();
        zipfile.on('entry', (entry) => {
          if (/\.(jpg|jpeg|png|gif|webp)$/i.test(entry.fileName)) {
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) {
                zipfile.readEntry();
                return;
              }

              const chunks = [];
              readStream.on('data', (chunk) => chunks.push(chunk));
              readStream.on('end', () => {
                const imageBuffer = Buffer.concat(chunks);
                const base64Image = imageBuffer.toString('base64');
                
                // Extract product name from filename - remove extension and any suffixes
                // Support formats: "ProductName.jpg", "ProductName_image1.jpg", "ProductName-1.jpg"
                let productName = entry.fileName.replace(/\.[^/.]+$/, ''); // Remove extension
                productName = productName.replace(/_[^_]*$/, ''); // Remove _suffix
                productName = productName.replace(/-[^-]*$/, ''); // Remove -suffix
                productName = productName.replace(/[^a-zA-Z0-9\s]/g, ' ').trim(); // Clean special chars
                productName = productName.replace(/\s+/g, ' '); // Normalize spaces
                
                if (!images[productName]) {
                  images[productName] = [];
                }
                images[productName].push(`data:image/jpeg;base64,${base64Image}`);
                
                console.log(`Processed image: ${entry.fileName} -> Product: "${productName}"`);
                zipfile.readEntry();
              });
            });
          } else {
            zipfile.readEntry();
          }
        });

        zipfile.on('end', () => {
          res.json({
            success: true,
            products,
            images,
            message: `Processed ${products.length} products and ${Object.keys(images).length} image groups`
          });
        });

        zipfile.on('error', (err) => {
          reject(err);
        });
      });
    });

  } catch (error) {
    console.error('File processing error:', error);
    res.status(500).json({ error: 'File processing failed: ' + error.message });
  }
});

// Bulk product upload endpoint

// Users CRUD
app.get('/api/users', async (req, res) => {
  const search = (req.query.search || '').trim();
  const filter = search ? { $or: [ { fullName: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }, { username: { $regex: search, $options: 'i' } } ] } : {};
  const users = await User.find(filter).sort({ createdAt: -1 }).lean();
  res.json({ users });
});

// User Export Endpoints
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const jsPDF = require('jspdf');

// Export all users to CSV
app.get('/api/users/export/csv', async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 }).lean();
    
    // Prepare CSV data
    const csvData = users.map(user => ({
      _id: user._id,
      fullName: user.fullName || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      role: user.role || '',
      status: user.status || '',
      customerType: user.customerType || '',
      createdAt: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '',
      updatedAt: user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : ''
    }));

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="users_export_${new Date().toISOString().split('T')[0]}.csv"`);

    // Create CSV content
    const headers = ['User ID', 'Full Name', 'Email', 'Phone Number', 'Role', 'Status', 'Customer Type', 'Created At', 'Last Updated'];
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => [
        `"${row._id}"`,
        `"${row.fullName}"`,
        `"${row.email}"`,
        `"${row.phoneNumber}"`,
        `"${row.role}"`,
        `"${row.status}"`,
        `"${row.customerType}"`,
        `"${row.createdAt}"`,
        `"${row.updatedAt}"`
      ].join(','))
    ].join('\n');

    res.send(csvContent);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: 'Failed to export users to CSV' });
  }
});

// Export all users to PDF
app.get('/api/users/export/pdf', async (req, res) => {
  try {
    console.log('Starting PDF export...');
    const users = await User.find({}).sort({ createdAt: -1 }).lean();
    console.log(`Found ${users.length} users for PDF export`);
    
    // Create a simple HTML document that can be converted to PDF
    let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>NethwinLK - User Export Report</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { max-width: 200px; height: auto; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>
        <div class="header">
            <img src="https://res.cloudinary.com/dz6bntmc6/image/upload/v1758739710/fLogo_xy2tut.png" alt="NethwinLK Logo" class="logo" onerror="this.style.display='none'">
            <h1>NethwinLK - User Export Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
            <p>Total Users: ${users.length}</p>
        </div>
        <table>
            <thead>
                <tr>
                    <th>User ID</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created At</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    users.forEach(user => {
      htmlContent += `
        <tr>
            <td>${user._id.toString().substring(0, 8)}...</td>
            <td>${user.fullName || ''}</td>
            <td>${user.email || ''}</td>
            <td>${user.phoneNumber || ''}</td>
            <td>${user.role || ''}</td>
            <td>${user.status || ''}</td>
            <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''}</td>
        </tr>
      `;
    });
    
    htmlContent += `
            </tbody>
        </table>
    </body>
    </html>
    `;

    // Set response headers for HTML download (can be converted to PDF by browser)
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="users_export_${new Date().toISOString().split('T')[0]}.html"`);

    // Send HTML
    console.log('Sending HTML export...');
    res.send(htmlContent);
  } catch (error) {
    console.error('PDF export error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to export users to PDF', details: error.message });
  }
});

// Export individual user profile to PDF
app.get('/api/users/:id/export/pdf', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's orders
    const orders = await Order.find({
      $or: [
        { customerEmail: user.email },
        { 'meta.userId': userId }
      ]
    }).sort({ createdAt: -1 }).lean();

    // Create HTML document
    let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>NethwinLK - User Profile Report</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            h2 { color: #666; border-bottom: 2px solid #ddd; padding-bottom: 5px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { max-width: 200px; height: auto; margin-bottom: 15px; }
            .user-details { margin: 20px 0; }
            .detail-row { margin: 8px 0; }
            .detail-label { font-weight: bold; display: inline-block; width: 150px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>
        <div class="header">
            <img src="https://res.cloudinary.com/dz6bntmc6/image/upload/v1758739710/fLogo_xy2tut.png" alt="NethwinLK Logo" class="logo" onerror="this.style.display='none'">
            <h1>NethwinLK - User Profile Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <h2>Personal Information</h2>
        <div class="user-details">
            <div class="detail-row"><span class="detail-label">User ID:</span> ${user._id}</div>
            <div class="detail-row"><span class="detail-label">Full Name:</span> ${user.fullName || ''}</div>
            <div class="detail-row"><span class="detail-label">Email:</span> ${user.email || ''}</div>
            <div class="detail-row"><span class="detail-label">Phone Number:</span> ${user.phoneNumber || ''}</div>
            <div class="detail-row"><span class="detail-label">Role:</span> ${user.role || ''}</div>
            <div class="detail-row"><span class="detail-label">Status:</span> ${user.status || ''}</div>
            <div class="detail-row"><span class="detail-label">Customer Type:</span> ${user.customerType || ''}</div>
            <div class="detail-row"><span class="detail-label">Address:</span> ${user.address || ''}</div>
            <div class="detail-row"><span class="detail-label">Province:</span> ${user.province || ''}</div>
            <div class="detail-row"><span class="detail-label">District:</span> ${user.district || ''}</div>
            <div class="detail-row"><span class="detail-label">City:</span> ${user.city || ''}</div>
            <div class="detail-row"><span class="detail-label">ZIP Code:</span> ${user.zipCode || ''}</div>
            <div class="detail-row"><span class="detail-label">Created At:</span> ${user.createdAt ? new Date(user.createdAt).toLocaleString() : ''}</div>
            <div class="detail-row"><span class="detail-label">Last Updated:</span> ${user.updatedAt ? new Date(user.updatedAt).toLocaleString() : ''}</div>
        </div>
    `;

    // Add order history section
    if (orders.length > 0) {
      htmlContent += `
        <h2>Order History</h2>
        <table>
            <thead>
                <tr>
                    <th>Order Number</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
      `;
      
      orders.forEach(order => {
        htmlContent += `
          <tr>
              <td>${order.orderNumber || order._id.toString().substring(0, 8) + '...'}</td>
              <td>${order.type || ''}</td>
              <td>${order.status || ''}</td>
              <td>${order.total || 0}</td>
              <td>${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''}</td>
          </tr>
        `;
      });
      
      htmlContent += `
            </tbody>
        </table>
      `;
    } else {
      htmlContent += `
        <h2>Order History</h2>
        <p>No orders found for this user.</p>
      `;
    }

    htmlContent += `
    </body>
    </html>
    `;

    // Set response headers for HTML download
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="user_profile_${user.fullName || user.email}_${new Date().toISOString().split('T')[0]}.html"`);

    // Send HTML
    res.send(htmlContent);
  } catch (error) {
    console.error('Individual PDF export error:', error);
    res.status(500).json({ error: 'Failed to export user profile to PDF' });
  }
});

// Product Export Endpoints

// Export book catalog to Excel
app.get('/api/products/export/catalog/excel', async (req, res) => {
  try {
    console.log('Starting book catalog Excel export...');
    const products = await Product.find({}).sort({ createdAt: -1 }).lean();
    console.log(`Found ${products.length} products for catalog export`);
    
    // Prepare Excel data
    const excelData = products.map(product => ({
      'Book ID': product.productId,
      'Title': product.name,
      'Author': product.brand || 'N/A',
      'Genre': product.category,
      'Price': product.sellingPrice,
      'Stock': product.stock,
      'Status': product.status,
      'Created At': product.createdAt ? new Date(product.createdAt).toLocaleDateString() : '',
      'Updated At': product.updatedAt ? new Date(product.updatedAt).toLocaleDateString() : ''
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    const columnWidths = [
      { wch: 15 }, // Book ID
      { wch: 30 }, // Title
      { wch: 20 }, // Author
      { wch: 15 }, // Genre
      { wch: 10 }, // Price
      { wch: 8 },  // Stock
      { wch: 12 }, // Status
      { wch: 12 }, // Created At
      { wch: 12 }  // Updated At
    ];
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Book Catalog');

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="book_catalog_${new Date().toISOString().split('T')[0]}.xlsx"`);

    // Send Excel file
    console.log(`Excel catalog generated successfully, size: ${excelBuffer.length} bytes`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('Excel catalog export error:', error);
    res.status(500).json({ error: 'Failed to export book catalog to Excel' });
  }
});

// Export book catalog to PDF (HTML)
app.get('/api/products/export/catalog/pdf', async (req, res) => {
  try {
    console.log('Starting book catalog PDF export...');
    const products = await Product.find({}).sort({ createdAt: -1 }).lean();
    console.log(`Found ${products.length} products for catalog export`);
    
    // Create HTML document
    let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>NethwinLK - Book Catalog Report</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { max-width: 200px; height: auto; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .low-stock { background-color: #ffebee; }
        </style>
    </head>
    <body>
        <div class="header">
            <img src="https://res.cloudinary.com/dz6bntmc6/image/upload/v1758739710/fLogo_xy2tut.png" alt="NethwinLK Logo" class="logo" onerror="this.style.display='none'">
            <h1>NethwinLK - Book Catalog Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
            <p>Total Books: ${products.length}</p>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Book ID</th>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Genre</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Created At</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    products.forEach(product => {
      const isLowStock = product.stock < 10;
      const rowClass = isLowStock ? 'class="low-stock"' : '';
      
      htmlContent += `
        <tr ${rowClass}>
            <td>${product.productId}</td>
            <td>${product.name}</td>
            <td>${product.brand || 'N/A'}</td>
            <td>${product.category}</td>
            <td>Rs. ${product.sellingPrice}</td>
            <td>${product.stock}</td>
            <td>${product.status}</td>
            <td>${product.createdAt ? new Date(product.createdAt).toLocaleDateString() : ''}</td>
        </tr>
      `;
    });
    
    htmlContent += `
            </tbody>
        </table>
    </body>
    </html>
    `;

    // Set response headers for HTML download
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="book_catalog_${new Date().toISOString().split('T')[0]}.html"`);

    // Send HTML
    console.log('Sending HTML catalog export...');
    res.send(htmlContent);
  } catch (error) {
    console.error('PDF catalog export error:', error);
    res.status(500).json({ error: 'Failed to export book catalog to PDF' });
  }
});

// Export low stock report to Excel
app.get('/api/products/export/low-stock/excel', async (req, res) => {
  try {
    console.log('Starting low stock Excel export...');
    const products = await Product.find({ stock: { $lt: 10 } }).sort({ stock: 1, createdAt: -1 }).lean();
    console.log(`Found ${products.length} products with low stock`);
    
    // Prepare Excel data
    const excelData = products.map(product => ({
      'Book ID': product.productId,
      'Title': product.name,
      'Author': product.brand || 'N/A',
      'Genre': product.category,
      'Price': product.sellingPrice,
      'Stock': product.stock,
      'Status': product.status,
      'Created At': product.createdAt ? new Date(product.createdAt).toLocaleDateString() : '',
      'Updated At': product.updatedAt ? new Date(product.updatedAt).toLocaleDateString() : ''
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    const columnWidths = [
      { wch: 15 }, // Book ID
      { wch: 30 }, // Title
      { wch: 20 }, // Author
      { wch: 15 }, // Genre
      { wch: 10 }, // Price
      { wch: 8 },  // Stock
      { wch: 12 }, // Status
      { wch: 12 }, // Created At
      { wch: 12 }  // Updated At
    ];
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Low Stock Report');

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="low_stock_report_${new Date().toISOString().split('T')[0]}.xlsx"`);

    // Send Excel file
    console.log(`Excel low stock report generated successfully, size: ${excelBuffer.length} bytes`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('Excel low stock export error:', error);
    res.status(500).json({ error: 'Failed to export low stock report to Excel' });
  }
});

// Export low stock report to PDF (HTML)
app.get('/api/products/export/low-stock/pdf', async (req, res) => {
  try {
    console.log('Starting low stock PDF export...');
    const products = await Product.find({ stock: { $lt: 10 } }).sort({ stock: 1, createdAt: -1 }).lean();
    console.log(`Found ${products.length} products with low stock`);
    
    // Create HTML document
    let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>NethwinLK - Low Stock Report</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #d32f2f; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { max-width: 200px; height: auto; margin-bottom: 15px; }
            .warning { background-color: #ffebee; padding: 10px; border-left: 4px solid #d32f2f; margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .critical { background-color: #ffcdd2; }
            .warning-row { background-color: #fff3e0; }
        </style>
    </head>
    <body>
        <div class="header">
            <img src="https://res.cloudinary.com/dz6bntmc6/image/upload/v1758739710/fLogo_xy2tut.png" alt="NethwinLK Logo" class="logo" onerror="this.style.display='none'">
            <h1>NethwinLK - Low Stock Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        <div class="warning">
            <strong>⚠️ Warning:</strong> ${products.length} books have stock levels below 10 units.
        </div>
        <table>
            <thead>
                <tr>
                    <th>Book ID</th>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Genre</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Created At</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    products.forEach(product => {
      let rowClass = '';
      if (product.stock === 0) {
        rowClass = 'class="critical"';
      } else if (product.stock < 5) {
        rowClass = 'class="warning-row"';
      }
      
      htmlContent += `
        <tr ${rowClass}>
            <td>${product.productId}</td>
            <td>${product.name}</td>
            <td>${product.brand || 'N/A'}</td>
            <td>${product.category}</td>
            <td>Rs. ${product.sellingPrice}</td>
            <td><strong>${product.stock}</strong></td>
            <td>${product.status}</td>
            <td>${product.createdAt ? new Date(product.createdAt).toLocaleDateString() : ''}</td>
        </tr>
      `;
    });
    
    htmlContent += `
            </tbody>
        </table>
    </body>
    </html>
    `;

    // Set response headers for HTML download
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="low_stock_report_${new Date().toISOString().split('T')[0]}.html"`);

    // Send HTML
    console.log('Sending HTML low stock export...');
    res.send(htmlContent);
  } catch (error) {
    console.error('PDF low stock export error:', error);
    res.status(500).json({ error: 'Failed to export low stock report to PDF' });
  }
});

// Cart Export Endpoints

// Export cart summary to PDF (HTML)
app.post('/api/cart/export/summary', async (req, res) => {
  try {
    console.log('Starting cart summary export...');
    const cartData = req.body;
    console.log(`Cart has ${cartData.items.length} items`);
    
    // Create HTML document
    let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>NethwinLK - Cart Summary</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { max-width: 200px; height: auto; margin-bottom: 15px; }
            .cart-info { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .total-section { margin-top: 20px; padding: 15px; background-color: #e8f5e8; border-radius: 8px; }
            .total-row { font-weight: bold; font-size: 18px; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <img src="https://res.cloudinary.com/dz6bntmc6/image/upload/v1758739710/fLogo_xy2tut.png" alt="NethwinLK Logo" class="logo" onerror="this.style.display='none'">
            <h1>NethwinLK - Cart Summary</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="cart-info">
            <p><strong>Total Items:</strong> ${cartData.items.length}</p>
            <p><strong>Cart Total:</strong> LKR ${cartData.total.toFixed(2)}</p>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Item Name</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Subtotal</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    cartData.items.forEach(item => {
      htmlContent += `
        <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>LKR ${item.price.toFixed(2)}</td>
            <td>LKR ${item.subtotal.toFixed(2)}</td>
        </tr>
      `;
    });
    
    htmlContent += `
            </tbody>
        </table>
        
        <div class="total-section">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>Subtotal:</span>
                <span>LKR ${cartData.subtotal.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>Delivery Fee:</span>
                <span>LKR ${cartData.deliveryFee.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 2px solid #333; padding-top: 10px;" class="total-row">
                <span>Total:</span>
                <span>LKR ${cartData.total.toFixed(2)}</span>
            </div>
        </div>
        
        <div class="footer">
            <p>Thank you for shopping with NethwinLK!</p>
            <p>This is a cart summary. Complete your purchase to receive an official invoice.</p>
        </div>
    </body>
    </html>
    `;

    // Set response headers for HTML download
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="cart_summary_${new Date().toISOString().split('T')[0]}.html"`);

    // Send HTML
    console.log('Sending HTML cart summary export...');
    res.send(htmlContent);
  } catch (error) {
    console.error('Cart summary export error:', error);
    res.status(500).json({ error: 'Failed to export cart summary' });
  }
});

// Invoice Generation Endpoint

// Generate invoice/receipt for completed order
app.post('/api/orders/:orderId/invoice', async (req, res) => {
  try {
    console.log('Starting invoice generation...');
    const orderId = req.params.orderId;
    
    // Find the order
    const order = await Order.findById(orderId).lean();
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    console.log(`Generating invoice for order: ${order.orderNumber || orderId}`);
    
    // Create HTML document for invoice
    let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>NethwinLK - Invoice #${order.orderNumber || orderId}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .invoice-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .logo { max-width: 200px; height: auto; margin-bottom: 15px; }
            .invoice-title { font-size: 28px; font-weight: bold; color: #333; margin-bottom: 10px; }
            .invoice-number { font-size: 18px; color: #666; }
            .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .customer-info, .order-info { width: 45%; }
            .info-section { background-color: #f8f9fa; padding: 15px; border-radius: 8px; }
            .info-section h3 { margin-top: 0; color: #333; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .total-section { margin-top: 20px; padding: 20px; background-color: #e8f5e8; border-radius: 8px; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .final-total { font-weight: bold; font-size: 20px; border-top: 2px solid #333; padding-top: 10px; }
            .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
            .status-badge { 
                display: inline-block; 
                padding: 4px 12px; 
                border-radius: 20px; 
                font-size: 12px; 
                font-weight: bold;
                text-transform: uppercase;
            }
            .status-pending { background-color: #fff3cd; color: #856404; }
            .status-confirmed { background-color: #d1ecf1; color: #0c5460; }
            .status-processing { background-color: #d4edda; color: #155724; }
            .status-shipped { background-color: #cce5ff; color: #004085; }
            .status-delivered { background-color: #d1f2eb; color: #0f5132; }
            .status-cancelled { background-color: #f8d7da; color: #721c24; }
        </style>
    </head>
    <body>
        <div class="invoice-header">
            <img src="https://res.cloudinary.com/dz6bntmc6/image/upload/v1758739710/fLogo_xy2tut.png" alt="NethwinLK Logo" class="logo" onerror="this.style.display='none'">
            <div class="invoice-title">NethwinLK</div>
            <div class="invoice-number">Invoice #${order.orderNumber || orderId}</div>
            <div style="margin-top: 10px; font-size: 14px; color: #666;">
                Generated on: ${new Date().toLocaleDateString()}
            </div>
        </div>
        
        <div class="invoice-details">
            <div class="customer-info">
                <div class="info-section">
                    <h3>Customer Information</h3>
                    <p><strong>Name:</strong> ${order.customerName || 'N/A'}</p>
                    <p><strong>Email:</strong> ${order.customerEmail || 'N/A'}</p>
                    <p><strong>Phone:</strong> ${order.customerPhone || 'N/A'}</p>
                    ${order.deliveryAddress ? `<p><strong>Address:</strong> ${order.deliveryAddress}</p>` : ''}
                </div>
            </div>
            
            <div class="order-info">
                <div class="info-section">
                    <h3>Order Information</h3>
                    <p><strong>Order Date:</strong> ${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</p>
                    <p><strong>Order Type:</strong> ${order.type || 'N/A'}</p>
                    <p><strong>Status:</strong> <span class="status-badge status-${order.status}">${order.status}</span></p>
                    <p><strong>Payment Method:</strong> ${order.paymentMethod || 'N/A'}</p>
                    <p><strong>Delivery Method:</strong> ${order.deliveryMethod || 'N/A'}</p>
                </div>
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Item Name</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Subtotal</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    order.items.forEach(item => {
      htmlContent += `
        <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>LKR ${item.price.toFixed(2)}</td>
            <td>LKR ${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
      `;
    });
    
    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = order.deliveryFee || 0;
    const total = order.total || (subtotal + deliveryFee);
    
    htmlContent += `
            </tbody>
        </table>
        
        <div class="total-section">
            <div class="total-row">
                <span>Subtotal:</span>
                <span>LKR ${subtotal.toFixed(2)}</span>
            </div>
            <div class="total-row">
                <span>Delivery Fee:</span>
                <span>LKR ${deliveryFee.toFixed(2)}</span>
            </div>
            <div class="total-row final-total">
                <span>Total:</span>
                <span>LKR ${total.toFixed(2)}</span>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Thank you for your business!</strong></p>
            <p>This is your official invoice/receipt from NethwinLK.</p>
            <p>For any questions, please contact us at support@nethwinlk.com</p>
        </div>
    </body>
    </html>
    `;

    // Set response headers for HTML download
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="invoice_${order.orderNumber || orderId}_${new Date().toISOString().split('T')[0]}.html"`);

    // Send HTML
    console.log('Sending HTML invoice...');
    res.send(htmlContent);
  } catch (error) {
    console.error('Invoice generation error:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
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

// Debug endpoint for Excel parsing
app.post('/api/debug-excel', (req, res) => {
  console.log('🔍 Debug Excel Request');
  console.log('=====================');
  console.log('Request body keys:', Object.keys(req.body));
  console.log('Excel data length:', req.body.excelData ? req.body.excelData.length : 'No excelData');
  
  if (req.body.excelData) {
    try {
      const excelBuffer = Buffer.from(req.body.excelData, 'base64');
      console.log('Excel buffer size:', excelBuffer.length);
      
      const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
      console.log('Workbook created successfully');
      console.log('Sheet names:', workbook.SheetNames);
      
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      console.log('Worksheet range:', worksheet['!ref']);
      
      let products = XLSX.utils.sheet_to_json(worksheet, { 
        header: 0,
        defval: '',
        raw: false
      });
      
      console.log('Products found:', products.length);
      console.log('First product type:', typeof products[0]);
      console.log('First product is array:', Array.isArray(products[0]));
      
      if (products.length > 0) {
        console.log('First product:', products[0]);
        console.log('Product keys:', Object.keys(products[0]));
      }
      
      res.json({
        success: true,
        products: products.length,
        firstProduct: products[0],
        message: `Found ${products.length} products`
      });
      
    } catch (error) {
      console.error('Excel parsing error:', error);
      res.json({
        success: false,
        error: error.message,
        message: 'Excel parsing failed'
      });
    }
  } else {
    res.json({
      success: false,
      error: 'No Excel data provided',
      message: 'No Excel data in request'
    });
  }
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
      // Only show approved reviews to public
      status: 'approved'
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
      status: 'pending'
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
    const { status, adminNotes } = req.body;
    
    console.log('Updating review status for ID:', id);
    console.log('Update data:', { status, adminNotes });
    
    const updateData = {};
    if (status) updateData.status = status;
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

// Delete review (admin only) - Actually removes from database
app.delete('/api/reviews/:id', async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    res.json({ success: true, message: 'Review permanently deleted from database' });
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

// Bulk actions for reviews (admin only)
app.post('/api/admin/reviews/bulk-action', async (req, res) => {
  try {
    const { action, reviewIds } = req.body;
    
    if (!action || !reviewIds || !Array.isArray(reviewIds)) {
      return res.status(400).json({ error: 'Action and review IDs are required' });
    }
    
    let updateData = {};
    let message = '';
    
    let result;
    
    switch (action) {
      case 'approve':
        updateData = { status: 'approved', approvedAt: new Date() };
        message = `${reviewIds.length} reviews approved successfully`;
        result = await Review.updateMany(
          { _id: { $in: reviewIds } },
          updateData
        );
        break;
      case 'delete':
        // Actually delete from database
        result = await Review.deleteMany({ _id: { $in: reviewIds } });
        message = `${result.deletedCount} reviews permanently deleted from database`;
        break;
      case 'pending':
        updateData = { status: 'pending' };
        message = `${reviewIds.length} reviews set to pending`;
        result = await Review.updateMany(
          { _id: { $in: reviewIds } },
          updateData
        );
        break;
      default:
        return res.status(400).json({ error: 'Invalid action. Use: approve, delete, or pending' });
    }
    
    res.json({
      success: true,
      message,
      modifiedCount: result.modifiedCount || result.deletedCount || 0
    });
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
        phone: user.phoneNumber || '',
        phoneNumber: user.phoneNumber || '',
        username: user.username || '',
        address: user.address || '',
        province: user.province || '',
        district: user.district || '',
        city: user.city || '',
        zipCode: user.zipCode || ''
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

      // Use frontend calculated price if provided, otherwise calculate on backend
      let estimatedPrice;
      if (req.body.estimatedPrice) {
        estimatedPrice = parseInt(req.body.estimatedPrice);
        console.log('Using frontend calculated price:', estimatedPrice);
      } else {
        estimatedPrice = calculatePrintPrice(
          req.body.paperSize,
          req.body.colorOption,
          parseInt(req.body.copies),
          req.body.binding,
          req.body.finishing,
          req.body.deliveryMethod
        );
        console.log('Using backend calculated price:', estimatedPrice);
      }

      // Convert delivery method to match schema
      const deliveryMethod = req.body.deliveryMethod === 'Home Delivery' ? 'delivery' : 'pickup';

      // Get next queue position
      const lastOrder = await PrintOrder.findOne({ status: { $in: ['pending', 'in_queue', 'in_progress'] } })
        .sort({ queuePosition: -1 })
        .lean();
      const nextQueuePosition = lastOrder ? lastOrder.queuePosition + 1 : 1;

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
        queuePosition: nextQueuePosition,
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

// ========================================
// PRINT JOB QUEUE MANAGEMENT API ROUTES
// ========================================

// GET /api/print-orders/queue - Get print job queue
app.get('/api/print-orders/queue', async (req, res) => {
  try {
    const { status = 'in_queue,in_progress', priority, page = 1, limit = 50 } = req.query;
    
    // Parse status filter
    const statusFilter = status.split(',').map(s => s.trim());
    
    const filter = { status: { $in: statusFilter } };
    if (priority) filter.priority = priority;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const orders = await PrintOrder.find(filter)
      .sort({ 
        priority: 1,        // urgent first, then high, normal, low
        queuePosition: 1,   // then by queue position
        createdAt: 1        // then by creation time
      })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await PrintOrder.countDocuments(filter);

    // Calculate queue statistics
    const stats = await PrintOrder.aggregate([
      { $match: { status: { $in: statusFilter } } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgProgress: { $avg: '$progress' }
      }}
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        stats: stats.reduce((acc, stat) => {
          acc[stat._id] = { count: stat.count, avgProgress: stat.avgProgress || 0 };
          return acc;
        }, {})
      }
    });

  } catch (error) {
    console.error('Get print queue error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch print queue'
    });
  }
});

// PUT /api/print-orders/:id/priority - Update job priority
app.put('/api/print-orders/:id/priority', async (req, res) => {
  try {
    const { priority } = req.body;
    
    if (!['low', 'normal', 'high', 'urgent'].includes(priority)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid priority. Must be: low, normal, high, or urgent'
      });
    }

    const updatedOrder = await PrintOrder.findByIdAndUpdate(
      req.params.id,
      { $set: { priority } },
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
      message: 'Priority updated successfully'
    });

  } catch (error) {
    console.error('Update priority error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update priority'
    });
  }
});

// PUT /api/print-orders/:id/status - Update job status
app.put('/api/print-orders/:id/status', async (req, res) => {
  try {
    const { status, progress, assignedPrinter, assignedOperator } = req.body;
    
    if (!['pending', 'in_queue', 'in_progress', 'ready', 'completed', 'cancelled', 'failed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    const updateData = { status };
    
    if (progress !== undefined) updateData.progress = Math.max(0, Math.min(100, progress));
    if (assignedPrinter !== undefined) updateData.assignedPrinter = assignedPrinter;
    if (assignedOperator !== undefined) updateData.assignedOperator = assignedOperator;
    
    // Set timestamps based on status
    if (status === 'in_progress' && !assignedPrinter) {
      updateData.actualStartTime = new Date();
    }
    if (status === 'completed') {
      updateData.actualEndTime = new Date();
      updateData.progress = 100;
    }

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
      message: 'Status updated successfully'
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update status'
    });
  }
});

// POST /api/print-orders/reorder - Reorder queue positions
app.post('/api/print-orders/reorder', async (req, res) => {
  try {
    const { orderIds } = req.body; // Array of order IDs in new order
    
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'orderIds array is required'
      });
    }

    // Update queue positions
    const updatePromises = orderIds.map((orderId, index) => 
      PrintOrder.findByIdAndUpdate(
        orderId,
        { $set: { queuePosition: index + 1 } },
        { new: true }
      )
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Queue reordered successfully'
    });

  } catch (error) {
    console.error('Reorder queue error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reorder queue'
    });
  }
});

// GET /api/print-orders/queue/stats - Get queue statistics
app.get('/api/print-orders/queue/stats', async (req, res) => {
  try {
    const stats = await PrintOrder.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgProgress: { $avg: '$progress' },
          avgWaitTime: {
            $avg: {
              $subtract: [new Date(), '$createdAt']
            }
          }
        }
      }
    ]);

    const priorityStats = await PrintOrder.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalJobs = await PrintOrder.countDocuments();
    const completedToday = await PrintOrder.countDocuments({
      status: 'completed',
      actualEndTime: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    });

    res.json({
      success: true,
      data: {
        statusStats: stats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            avgProgress: stat.avgProgress || 0,
            avgWaitTime: stat.avgWaitTime || 0
          };
          return acc;
        }, {}),
        priorityStats: priorityStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        totalJobs,
        completedToday
      }
    });

  } catch (error) {
    console.error('Get queue stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch queue statistics'
    });
  }
});

// PUT /api/print-orders/:id/assign - Assign job to printer/operator
app.put('/api/print-orders/:id/assign', async (req, res) => {
  try {
    const { assignedPrinter, assignedOperator } = req.body;

    const updateData = {};
    if (assignedPrinter) updateData.assignedPrinter = assignedPrinter;
    if (assignedOperator) updateData.assignedOperator = assignedOperator;

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
      message: 'Job assigned successfully'
    });

  } catch (error) {
    console.error('Assign job error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign job'
    });
  }
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

// ==================== ORDER EXPORT FUNCTIONALITY ====================

// GET /api/orders/:id/quotation - Export individual bookshop order quotation as HTML
app.get('/api/orders/:id/quotation', async (req, res) => {
  try {
    console.log('Starting bookshop order quotation export...');
    const orderId = req.params.id;
    
    // Find the order
    const order = await Order.findById(orderId).lean();
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    console.log(`Generating quotation for bookshop order: ${orderId}`);
    
    // Create HTML document for quotation
    let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>NethwinLK - Book Order Quotation #${orderId}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { max-width: 200px; height: auto; margin-bottom: 15px; }
            .quotation-info { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .total-section { margin-top: 20px; padding: 15px; background-color: #e8f5e8; border-radius: 8px; }
            .total-row { font-weight: bold; font-size: 18px; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <img src="https://res.cloudinary.com/dz6bntmc6/image/upload/v1758739710/fLogo_xy2tut.png" alt="NethwinLK Logo" class="logo" onerror="this.style.display='none'">
            <h1>NethwinLK - Book Order Quotation</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="quotation-info">
            <p><strong>Order ID:</strong> ${order._id}</p>
            <p><strong>Customer:</strong> ${order.userName || 'N/A'}</p>
            <p><strong>Contact:</strong> ${order.contactNumber || 'N/A'}</p>
            <p><strong>Email:</strong> ${order.email || 'N/A'}</p>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Book Title</th>
                    <th>Author</th>
                    <th>Category</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${order.items.map(item => `
                    <tr>
                        <td>${item.name || 'N/A'}</td>
                        <td>${item.author || 'N/A'}</td>
                        <td>${item.category || 'N/A'}</td>
                        <td>${item.quantity || 1}</td>
                        <td>Rs. ${(item.price || 0).toFixed(2)}</td>
                        <td>Rs. ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="total-section">
            <div class="total-row">
                <strong>Subtotal: Rs. ${(order.subtotal || 0).toFixed(2)}</strong>
            </div>
            ${order.deliveryFee > 0 ? `
                <div style="margin-top: 10px;">
                    <strong>Delivery Fee: Rs. ${order.deliveryFee.toFixed(2)}</strong>
                </div>
            ` : ''}
            <div style="margin-top: 10px; border-top: 2px solid #333; padding-top: 10px;">
                <strong>Total Amount: Rs. ${(order.total || 0).toFixed(2)}</strong>
            </div>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background-color: #f0f8ff; border-radius: 8px;">
            <h3>Order Details</h3>
            <p><strong>Delivery Method:</strong> ${order.deliveryMethod || 'Store Pickup'}</p>
            ${order.deliveryAddress ? `<p><strong>Delivery Address:</strong> ${order.deliveryAddress}</p>` : ''}
            <p><strong>Payment Method:</strong> ${order.paymentMethod || 'Cash on Delivery'}</p>
            <p><strong>Order Status:</strong> ${order.status || 'Pending'}</p>
            <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
        
        <div class="footer">
            <p>Thank you for choosing NethwinLK for your book needs!</p>
            <p>This is a quotation. Final price may vary based on availability.</p>
        </div>
    </body>
    </html>
    `;
    
    console.log('Sending HTML quotation export...');
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="book-order-quotation-${orderId}.html"`);
    res.send(htmlContent);
    
  } catch (error) {
    console.error('Book order quotation export error:', error);
    res.status(500).json({ error: 'Failed to generate quotation' });
  }
});

// GET /api/print-orders/:id/quotation - Export individual print job quotation as PDF
app.get('/api/print-orders/:id/quotation', async (req, res) => {
  try {
    console.log('Starting print job quotation export...');
    const orderId = req.params.id;
    
    // Find the print order
    const printOrder = await PrintOrder.findById(orderId).lean();
    if (!printOrder) {
      return res.status(404).json({ error: 'Print order not found' });
    }
    
    console.log(`Generating quotation for print order: ${orderId}`);
    
    // Create HTML document for quotation
    let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>NethwinLK - Print Job Quotation #${orderId}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { max-width: 200px; height: auto; margin-bottom: 15px; }
            .quotation-info { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .total-section { margin-top: 20px; padding: 15px; background-color: #e8f5e8; border-radius: 8px; }
            .total-row { font-weight: bold; font-size: 18px; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <img src="https://res.cloudinary.com/dz6bntmc6/image/upload/v1758739710/fLogo_xy2tut.png" alt="NethwinLK Logo" class="logo" onerror="this.style.display='none'">
            <h1>NethwinLK - Print Job Quotation</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="quotation-info">
            <p><strong>Job ID:</strong> ${printOrder._id}</p>
            <p><strong>Customer:</strong> ${printOrder.userName}</p>
            <p><strong>Contact:</strong> ${printOrder.contactNumber}</p>
            <p><strong>Email:</strong> ${printOrder.email}</p>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Specification</th>
                    <th>Details</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>File Name</td>
                    <td>${printOrder.originalFileName}</td>
                </tr>
                <tr>
                    <td>Paper Size</td>
                    <td>${printOrder.paperSize}</td>
                </tr>
                <tr>
                    <td>Color Option</td>
                    <td>${printOrder.colorOption}</td>
                </tr>
                <tr>
                    <td>Binding</td>
                    <td>${printOrder.binding}</td>
                </tr>
                <tr>
                    <td>Number of Copies</td>
                    <td>${printOrder.copies}</td>
                </tr>
                <tr>
                    <td>Finishing</td>
                    <td>${printOrder.finishing}</td>
                </tr>
                <tr>
                    <td>Delivery Method</td>
                    <td>${printOrder.deliveryMethod}</td>
                </tr>
                ${printOrder.additionalNotes ? `
                <tr>
                    <td>Additional Notes</td>
                    <td>${printOrder.additionalNotes}</td>
                </tr>
                ` : ''}
            </tbody>
        </table>
        
        <div class="total-section">
            <div style="display: flex; justify-content: space-between; border-top: 2px solid #333; padding-top: 10px;" class="total-row">
                <span>Estimated Cost:</span>
                <span>LKR ${(printOrder.estimatedPrice || 0).toFixed(2)}</span>
            </div>
        </div>
        
        <div class="footer">
            <p>Thank you for choosing NethwinLK for your printing needs!</p>
            <p>This is a quotation. Final price may vary based on actual requirements.</p>
        </div>
    </body>
    </html>
    `;
    
    console.log('Sending HTML quotation export...');
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="print-quotation-${orderId}.html"`);
    res.send(htmlContent);
    
  } catch (error) {
    console.error('Print quotation export error:', error);
    res.status(500).json({ error: 'Failed to generate quotation' });
  }
});

// GET /api/admin/print-orders/export/csv - Export all print jobs as CSV
app.get('/api/admin/print-orders/export/csv', async (req, res) => {
  try {
    console.log('Starting print orders CSV export...');
    
    // Get all print orders
    const printOrders = await PrintOrder.find({})
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`Found ${printOrders.length} print orders for CSV export`);
    
    // Create CSV content
    let csvContent = 'JobID,UserID,FileName,Status,Priority,EstimatedPrice,FinalPrice,PaperSize,ColorOption,Binding,Copies,Finishing,DeliveryMethod,CreatedAt,UpdatedAt\n';
    
    printOrders.forEach(order => {
      const row = [
        order._id,
        order.userId,
        `"${order.originalFileName}"`,
        order.status,
        order.priority,
        order.estimatedPrice || 0,
        order.finalPrice || 0,
        `"${order.paperSize}"`,
        `"${order.colorOption}"`,
        `"${order.binding}"`,
        order.copies,
        `"${order.finishing}"`,
        `"${order.deliveryMethod}"`,
        new Date(order.createdAt).toLocaleDateString(),
        new Date(order.updatedAt).toLocaleDateString()
      ].join(',');
      csvContent += row + '\n';
    });
    
    console.log('Sending CSV export...');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="print-orders-export.csv"');
    res.send(csvContent);
    
  } catch (error) {
    console.error('Print orders CSV export error:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// GET /api/admin/print-orders/export/pdf - Export all print jobs as PDF (HTML)
app.get('/api/admin/print-orders/export/pdf', async (req, res) => {
  try {
    console.log('Starting print orders PDF export...');
    
    // Get all print orders
    const printOrders = await PrintOrder.find({})
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`Found ${printOrders.length} print orders for PDF export`);
    
    // Create HTML document
    let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>NethwinLK - Print Orders Report</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { max-width: 200px; height: auto; margin-bottom: 15px; }
            .report-info { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .status-pending { color: #f59e0b; }
            .status-in_queue { color: #3b82f6; }
            .status-in_progress { color: #8b5cf6; }
            .status-ready { color: #10b981; }
            .status-completed { color: #059669; }
            .status-cancelled { color: #ef4444; }
            .status-failed { color: #dc2626; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <img src="https://res.cloudinary.com/dz6bntmc6/image/upload/v1758739710/fLogo_xy2tut.png" alt="NethwinLK Logo" class="logo" onerror="this.style.display='none'">
            <h1>NethwinLK - Print Orders Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="report-info">
            <p><strong>Total Print Orders:</strong> ${printOrders.length}</p>
            <p><strong>Report Period:</strong> All Time</p>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Job ID</th>
                    <th>User ID</th>
                    <th>File Name</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Estimated Price</th>
                    <th>Final Price</th>
                    <th>Created At</th>
                    <th>Updated At</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    printOrders.forEach(order => {
      htmlContent += `
        <tr>
            <td>${order._id}</td>
            <td>${order.userId}</td>
            <td>${order.originalFileName}</td>
            <td class="status-${order.status}">${order.status}</td>
            <td>${order.priority}</td>
            <td>LKR ${(order.estimatedPrice || 0).toFixed(2)}</td>
            <td>LKR ${(order.finalPrice || 0).toFixed(2)}</td>
            <td>${new Date(order.createdAt).toLocaleDateString()}</td>
            <td>${new Date(order.updatedAt).toLocaleDateString()}</td>
        </tr>
      `;
    });
    
    htmlContent += `
            </tbody>
        </table>
        
        <div class="footer">
            <p>Thank you for using NethwinLK Print Management System!</p>
            <p>This report contains all print orders in the system.</p>
        </div>
    </body>
    </html>
    `;
    
    console.log('Sending HTML print orders export...');
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', 'attachment; filename="print-orders-report.html"');
    res.send(htmlContent);
    
  } catch (error) {
    console.error('Print orders PDF export error:', error);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

// ==================== DELIVERY SETTINGS MANAGEMENT ====================

// GET /api/delivery-settings - Get current delivery settings
app.get('/api/delivery-settings', async (req, res) => {
  try {
    console.log('Fetching delivery settings...');
    
    // Get the active delivery settings
    let settings = await DeliverySettings.findOne({ isActive: true }).lean();
    
    // If no settings exist, create default ones
    if (!settings) {
      console.log('No delivery settings found, creating default...');
      settings = await DeliverySettings.create({
        localDeliveryPrice: 0,
        deliveryRadius: 10,
        deliveryZones: [],
        isActive: true
      });
    }
    
    console.log('Delivery settings retrieved:', settings);
    res.json({
      success: true,
      data: settings
    });
    
  } catch (error) {
    console.error('Error fetching delivery settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch delivery settings'
    });
  }
});

// PUT /api/admin/delivery-settings - Update delivery settings (Admin only)
app.put('/api/admin/delivery-settings', async (req, res) => {
  try {
    console.log('Updating delivery settings...');
    const { localDeliveryPrice, deliveryRadius, deliveryZones } = req.body;
    
    // Validate input
    if (localDeliveryPrice === undefined || localDeliveryPrice < 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid local delivery price is required'
      });
    }
    
    if (deliveryRadius === undefined || deliveryRadius < 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid delivery radius is required'
      });
    }
    
    // Get current settings
    let settings = await DeliverySettings.findOne({ isActive: true });
    
    if (!settings) {
      // Create new settings if none exist
      settings = await DeliverySettings.create({
        localDeliveryPrice,
        deliveryRadius,
        deliveryZones: deliveryZones || [],
        isActive: true
      });
    } else {
      // Update existing settings
      const oldPrice = settings.localDeliveryPrice;
      settings.localDeliveryPrice = localDeliveryPrice;
      settings.deliveryRadius = deliveryRadius;
      settings.deliveryZones = deliveryZones || [];
      settings.lastUpdatedBy = req.user?.id; // If authentication is added
      await settings.save();
      
      // If delivery price changed, update all existing print orders
      if (oldPrice !== localDeliveryPrice) {
        console.log(`Delivery price changed from ${oldPrice} to ${localDeliveryPrice}, updating existing orders...`);
        
        // Update all pending and in_queue print orders with delivery method
        const updateResult = await PrintOrder.updateMany(
          { 
            status: { $in: ['pending', 'in_queue'] },
            deliveryMethod: 'delivery'
          },
          { 
            $inc: { 
              estimatedPrice: localDeliveryPrice - oldPrice,
              finalPrice: localDeliveryPrice - oldPrice
            }
          }
        );
        
        console.log(`Updated ${updateResult.modifiedCount} print orders with new delivery price`);
      }
    }
    
    console.log('Delivery settings updated successfully');
    res.json({
      success: true,
      data: settings,
      message: 'Delivery settings updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating delivery settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update delivery settings'
    });
  }
});

// GET /api/print-orders/pricing - Get updated pricing information with current delivery settings
app.get('/api/print-orders/pricing', async (req, res) => {
  try {
    console.log('Fetching updated pricing information...');
    
    // Get current delivery settings
    const settings = await DeliverySettings.findOne({ isActive: true }).lean();
    const deliveryPrice = settings ? settings.localDeliveryPrice : 0;
    
    // Update pricing data with current delivery price
    const updatedPricingData = {
      ...pricingData,
      delivery: [
        { type: "Home Delivery", price: deliveryPrice },
        { type: "Pickup", price: 0 }
      ]
    };
    
    console.log('Updated pricing data with delivery price:', deliveryPrice);
    res.json({
      success: true,
      data: updatedPricingData
    });
    
  } catch (error) {
    console.error('Error fetching pricing information:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pricing information'
    });
  }
});

// ==================== BULK UPLOAD FUNCTIONALITY ====================

// Bulk upload storage configuration
const bulkUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads', 'bulk-upload');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const bulkUpload = multer({
  storage: bulkUploadStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for bulk uploads
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'excelFile') {
      if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.mimetype === 'application/vnd.ms-excel' ||
          file.originalname.endsWith('.xlsx') || 
          file.originalname.endsWith('.xls')) {
        cb(null, true);
      } else {
        cb(new Error('Only Excel files (.xlsx, .xls) are allowed for Excel upload!'), false);
      }
    } else if (file.fieldname === 'zipFile') {
      if (file.mimetype === 'application/zip' || 
          file.mimetype === 'application/x-zip-compressed' ||
          file.originalname.endsWith('.zip')) {
        cb(null, true);
      } else {
        cb(new Error('Only ZIP files are allowed for image upload!'), false);
      }
    } else {
      cb(new Error('Invalid file field!'), false);
    }
  }
});

// Bulk upload endpoint
app.post('/api/products/bulk-upload', bulkUpload.fields([
  { name: 'excelFile', maxCount: 1 },
  { name: 'zipFile', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('Bulk upload request received');
    
    if (!req.files || !req.files.excelFile || !req.files.zipFile) {
      return res.status(400).json({
        success: false,
        error: 'Both Excel and ZIP files are required'
      });
    }

    const excelFile = req.files.excelFile[0];
    const zipFile = req.files.zipFile[0];

    console.log('Processing files:', excelFile.filename, zipFile.filename);

    // Parse Excel file
    const workbook = XLSX.readFile(excelFile.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    console.log('Excel data parsed:', jsonData.length, 'rows');

    // Validate Excel template
    const requiredColumns = ['productId', 'name', 'category', 'brand', 'sellingPrice', 'purchasePrice', 'stock', 'discountPrice', 'description', 'status'];
    const headers = Object.keys(jsonData[0] || {});
    
    console.log('Excel headers found:', headers);
    console.log('Required columns:', requiredColumns);
    
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      console.log('Missing columns:', missingColumns);
      return res.status(400).json({
        success: false,
        error: `Missing required columns: ${missingColumns.join(', ')}. Found columns: ${headers.join(', ')}`
      });
    }

    // Extract images from ZIP file
    const images = await extractImagesFromZip(zipFile.path);
    console.log('Images extracted:', images.length);

    // Process products
    const results = {
      successful: 0,
      failed: 0,
      warnings: 0,
      successfulProducts: [],
      failedProducts: [],
      warningMessages: []
    };

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      try {
        // Find matching image
        const productName = row.name.toString().trim();
        const matchingImage = findMatchingImage(productName, images);
        
        if (!matchingImage) {
          results.warnings++;
          results.warningMessages.push(`No matching image found for product: ${productName}`);
        }

        // Create product data
        const productData = {
          productId: row.productId.toString().trim(),
          name: productName,
          category: row.category.toString().trim(),
          brand: row.brand ? row.brand.toString().trim() : '',
          sellingPrice: parseFloat(row.sellingPrice) || 0,
          purchasePrice: parseFloat(row.purchasePrice) || 0,
          stock: parseInt(row.stock) || 0,
          discountPrice: parseFloat(row.discountPrice) || 0,
          description: row.description ? row.description.toString().trim() : '',
          status: row.status.toString().trim() || 'active',
          images: [] // Will be populated after image upload
        };

        // Validate product data
        if (!productData.productId || !productData.name || !productData.category) {
          throw new Error('Missing required fields: productId, name, or category');
        }

        // Check if product already exists
        const existingProduct = await Product.findOne({ productId: productData.productId });
        if (existingProduct) {
          results.warnings++;
          results.warningMessages.push(`Product with ID ${productData.productId} already exists - skipping`);
          continue; // Skip this product and continue with the next one
        }

        // Skip products without images (schema requires at least one image)
        if (!matchingImage) {
          throw new Error('No matching image found - product requires at least one image');
        }

        // Upload image to Cloudinary
        try {
          // Convert buffer to data URI for Cloudinary
          const base64 = matchingImage.buffer.toString('base64');
          const mimeType = matchingImage.fileName.toLowerCase().endsWith('.png') ? 'image/png' : 
                         matchingImage.fileName.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg';
          const dataUri = `data:${mimeType};base64,${base64}`;
          
          const cloudinaryResult = await cloudinary.uploader.upload(dataUri, {
            folder: 'nethwinlk/products',
            resource_type: 'auto'
          });
          productData.images = [cloudinaryResult.secure_url];
          console.log(`Image uploaded for ${productName}: ${cloudinaryResult.secure_url}`);
        } catch (uploadError) {
          console.error(`Failed to upload image for ${productName}:`, uploadError);
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }

        // Save product to database
        const product = new Product(productData);
        await product.save();

        results.successful++;
        results.successfulProducts.push({
          name: productData.name,
          productId: productData.productId
        });

        console.log(`Product saved: ${productData.name}`);

      } catch (error) {
        console.error(`Error processing product ${i + 1}:`, error);
        results.failed++;
        results.failedProducts.push({
          name: row.name || 'Unknown',
          error: error.message
        });
      }
    }

    // Clean up uploaded files
    fs.unlinkSync(excelFile.path);
    fs.unlinkSync(zipFile.path);

    console.log('Bulk upload completed:', results);

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Bulk upload failed: ' + error.message
    });
  }
});

// Helper function to extract images from ZIP file
function extractImagesFromZip(zipPath) {
  return new Promise((resolve, reject) => {
    const images = [];
    
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(err);
        return;
      }

      zipfile.readEntry();
      
      zipfile.on('entry', (entry) => {
        // Check if it's an image file
        const fileName = entry.fileName.toLowerCase();
        if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              console.error('Error reading file from ZIP:', err);
              zipfile.readEntry();
              return;
            }

            const chunks = [];
            readStream.on('data', (chunk) => {
              chunks.push(chunk);
            });

            readStream.on('end', () => {
              const buffer = Buffer.concat(chunks);
              const nameWithoutExt = path.parse(entry.fileName).name;
              
              images.push({
                fileName: entry.fileName,
                nameWithoutExt: nameWithoutExt,
                buffer: buffer,
                size: buffer.length
              });
              
              zipfile.readEntry();
            });

            readStream.on('error', (err) => {
              console.error('Error reading stream:', err);
              zipfile.readEntry();
            });
          });
        } else {
          zipfile.readEntry();
        }
      });

      zipfile.on('end', () => {
        resolve(images);
      });

      zipfile.on('error', (err) => {
        reject(err);
      });
    });
  });
}

// Helper function to find matching image
function findMatchingImage(productName, images) {
  const normalizedProductName = productName.toLowerCase().trim();
  
  for (const image of images) {
    const normalizedImageName = image.nameWithoutExt.toLowerCase().trim();
    
    // Exact match (case-insensitive)
    if (normalizedImageName === normalizedProductName) {
      return image;
    }
  }
  
  return null;
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
  if (error.message && error.message.includes('Only PDF, DOC, DOCX, TXT, JPG, JPEG, PNG, and GIF files are allowed')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
  if (error.message && error.message.includes('Only JPG, JPEG, PNG, GIF, and WEBP image files are allowed')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
  if (error.message && error.message.includes('Only image files are allowed')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
  if (error.message && error.message.includes('Only Excel files')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
  if (error.message && error.message.includes('Only ZIP files')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
  
  // For any other error, return a proper JSON response
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: error.message || 'Unknown error'
  });
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

    // Check if Cloudinary is configured - force Cloudinary usage since CLOUDINARY_URL is set
    const isCloudinaryConfigured = process.env.CLOUDINARY_URL || 
                                 (process.env.CLOUDINARY_CLOUD_NAME && 
                                  process.env.CLOUDINARY_CLOUD_NAME !== 'your-cloudinary-cloud-name' &&
                                  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
                                  process.env.CLOUDINARY_API_KEY && 
                                  process.env.CLOUDINARY_API_KEY !== 'your-cloudinary-api-key' &&
                                  process.env.CLOUDINARY_API_KEY !== 'your_api_key' &&
                                  process.env.CLOUDINARY_API_SECRET && 
                                  process.env.CLOUDINARY_API_SECRET !== 'your-cloudinary-api-secret' &&
                                  process.env.CLOUDINARY_API_SECRET !== 'your_api_secret');

    let imageUrl, mobileImageUrl, thumbnailUrl, cloudinaryId;

    if (isCloudinaryConfigured) {
      // Cloudinary upload - construct the proper Cloudinary URL
      const cloudName = 'dz6bntmc6'; // Extract from CLOUDINARY_URL or use direct value
      const fullPath = req.file.filename; // This is the full Cloudinary path like "nethwinlk/hero-images/abc123"
      const publicId = fullPath.split('/').pop(); // Extract just the public ID (abc123)
      
      // Construct the Cloudinary URL
      imageUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${fullPath}`;
      mobileImageUrl = imageUrl; // Use same URL for mobile (Cloudinary handles responsive images)
      thumbnailUrl = imageUrl;   // Use same URL for thumbnail (Cloudinary handles transformations)
      cloudinaryId = fullPath;
      
      console.log('Cloudinary upload details:');
      console.log('- Cloud name:', cloudName);
      console.log('- Full path:', fullPath);
      console.log('- Public ID:', publicId);
      console.log('- Constructed URL:', imageUrl);
    } else {
      // Local storage fallback
      imageUrl = `/uploads/hero-images/${req.file.filename}`;
      mobileImageUrl = imageUrl; // Same image for mobile in local storage
      thumbnailUrl = imageUrl;   // Same image for thumbnail in local storage
      cloudinaryId = req.file.filename;
    }

    const heroImage = new HeroImage({
      title: title || 'New Hero Image',
      description: description || 'Amazing products await you',
      imageUrl: imageUrl,
      mobileImageUrl: mobileImageUrl,
      thumbnailUrl: thumbnailUrl,
      cloudinaryId: cloudinaryId,
      buttonText: buttonText || 'Shop Now',
      buttonLink: buttonLink || '/html/bookshop.html',
      displayOrder
    });

    await heroImage.save();
    res.json({ success: true, heroImage });
  } catch (error) {
    console.error('Error creating hero image:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create hero image',
      details: error.message 
    });
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

// MongoDB connection is already established above

// ==================== ANALYTICS & REPORTS API ENDPOINTS ====================

// POST /api/admin/analytics/sales-report - Generate sales reports
app.post('/api/admin/analytics/sales-report', async (req, res) => {
  try {
    console.log('Generating sales report...');
    const { period, format, startDate, endDate } = req.body;
    
    // Calculate date range based on period
    let dateFilter = {};
    const now = new Date();
    
    if (period === 'daily') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      dateFilter = { createdAt: { $gte: startOfDay, $lte: endOfDay } };
    } else if (period === 'monthly') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      dateFilter = { createdAt: { $gte: startOfMonth, $lte: endOfMonth } };
    } else if (period === 'yearly') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      dateFilter = { createdAt: { $gte: startOfYear, $lte: endOfYear } };
    } else if (period === 'custom' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = { createdAt: { $gte: start, $lte: end } };
    }
    
    // Fetch orders with date filter
    const orders = await Order.find(dateFilter).lean();
    const printOrders = await PrintOrder.find(dateFilter).lean();
    
    // Combine and process data
    const allOrders = [
      ...orders.map(order => ({
        _id: order._id,
        type: 'bookshop',
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        items: order.items,
        total: order.total,
        paymentMethod: order.paymentMethod,
        deliveryMethod: order.deliveryMethod,
        status: order.status,
        createdAt: order.createdAt,
        itemsCount: order.items ? order.items.length : 0
      })),
      ...printOrders.map(order => ({
        _id: order._id,
        type: 'print',
        orderNumber: order.orderNumber || order._id.toString().substring(0, 8),
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        items: [{ name: order.fileName, quantity: order.copies, price: order.estimatedPrice }],
        total: order.estimatedPrice,
        paymentMethod: order.paymentMethod,
        deliveryMethod: order.deliveryMethod,
        status: order.status,
        createdAt: order.createdAt,
        itemsCount: 1
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Generate report based on format
    if (format === 'pdf') {
      // Generate HTML report (can be converted to PDF by browser)
      const htmlContent = generateSalesReportHTML(allOrders, period, startDate, endDate);
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="sales-report-${period}-${new Date().toISOString().split('T')[0]}.html"`);
      res.send(htmlContent);
            } else if (format === 'excel') {
                // Generate CSV report (Excel-compatible)
                const csvBuffer = generateSalesReportExcel(allOrders, period, startDate, endDate);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="sales-report-${period}-${new Date().toISOString().split('T')[0]}.csv"`);
                res.send(csvBuffer);
    } else {
      res.status(400).json({ error: 'Invalid format. Use "pdf" or "excel".' });
    }
    
  } catch (error) {
    console.error('Sales report generation error:', error);
    res.status(500).json({ error: 'Failed to generate sales report' });
  }
});

// POST /api/admin/analytics/analytics-report - Generate comprehensive analytics report
app.post('/api/admin/analytics/analytics-report', async (req, res) => {
  try {
    console.log('Generating analytics report...');
    const { format } = req.body;
    
    // Fetch all data
    const users = await User.find({}).lean();
    const orders = await Order.find({}).lean();
    const printOrders = await PrintOrder.find({}).lean();
    const products = await Product.find({}).lean();
    
    // Calculate analytics
    const totalUsers = users.length;
    const activeUsers = users.filter(user => user.status === 'active').length;
    const totalOrders = orders.length + printOrders.length;
    const completedOrders = [...orders, ...printOrders].filter(order => 
      ['delivered', 'completed'].includes(order.status)
    ).length;
    
    // Top selling products
    const productSales = {};
    orders.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          const productName = item.name;
          if (!productSales[productName]) {
            productSales[productName] = { quantity: 0, revenue: 0 };
          }
          productSales[productName].quantity += item.quantity || 1;
          productSales[productName].revenue += (item.price || 0) * (item.quantity || 1);
        });
      }
    });
    
    const topSellingProducts = Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    
    // Revenue calculation
    const totalRevenue = [...orders, ...printOrders]
      .filter(order => ['delivered', 'completed'].includes(order.status))
      .reduce((sum, order) => sum + (order.total || order.estimatedPrice || 0), 0);
    
    const analyticsData = {
      totalUsers,
      activeUsers,
      totalOrders,
      completedOrders,
      topSellingProducts,
      totalRevenue,
      generatedAt: new Date()
    };
    
    // Generate report based on format
    if (format === 'pdf') {
      const htmlContent = generateAnalyticsReportHTML(analyticsData);
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-report-${new Date().toISOString().split('T')[0]}.html"`);
      res.send(htmlContent);
            } else if (format === 'excel') {
                const csvBuffer = generateAnalyticsReportExcel(analyticsData);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="analytics-report-${new Date().toISOString().split('T')[0]}.csv"`);
                res.send(csvBuffer);
    } else {
      res.status(400).json({ error: 'Invalid format. Use "pdf" or "excel".' });
    }
    
  } catch (error) {
    console.error('Analytics report generation error:', error);
    res.status(500).json({ error: 'Failed to generate analytics report' });
  }
});

// POST /api/admin/analytics/performance-report - Generate performance summary report
app.post('/api/admin/analytics/performance-report', async (req, res) => {
  try {
    console.log('Generating performance report...');
    const { format } = req.body;
    
    // Fetch data for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentOrders = await Order.find({ 
      createdAt: { $gte: thirtyDaysAgo } 
    }).lean();
    
    const recentPrintOrders = await PrintOrder.find({ 
      createdAt: { $gte: thirtyDaysAgo } 
    }).lean();
    
    const products = await Product.find({}).lean();
    
    // Calculate performance metrics
    const totalRevenue = [...recentOrders, ...recentPrintOrders]
      .filter(order => ['delivered', 'completed'].includes(order.status))
      .reduce((sum, order) => sum + (order.total || order.estimatedPrice || 0), 0);
    
    const averageOrderValue = recentOrders.length > 0 ? 
      recentOrders.reduce((sum, order) => sum + (order.total || 0), 0) / recentOrders.length : 0;
    
    const lowStockProducts = products.filter(product => product.stock < 10);
    
    // Payment method distribution
    const paymentMethods = {};
    [...recentOrders, ...recentPrintOrders].forEach(order => {
      const method = order.paymentMethod || 'Unknown';
      paymentMethods[method] = (paymentMethods[method] || 0) + 1;
    });
    
    // Delivery method distribution
    const deliveryMethods = {};
    [...recentOrders, ...recentPrintOrders].forEach(order => {
      const method = order.deliveryMethod || 'Unknown';
      deliveryMethods[method] = (deliveryMethods[method] || 0) + 1;
    });
    
    const performanceData = {
      totalRevenue,
      averageOrderValue,
      lowStockProducts,
      paymentMethods,
      deliveryMethods,
      period: 'Last 30 Days',
      generatedAt: new Date()
    };
    
    // Generate report based on format
    if (format === 'pdf') {
      const htmlContent = generatePerformanceReportHTML(performanceData);
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="performance-report-${new Date().toISOString().split('T')[0]}.html"`);
      res.send(htmlContent);
            } else if (format === 'excel') {
                const csvBuffer = generatePerformanceReportExcel(performanceData);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="performance-report-${new Date().toISOString().split('T')[0]}.csv"`);
                res.send(csvBuffer);
    } else {
      res.status(400).json({ error: 'Invalid format. Use "pdf" or "excel".' });
    }
    
  } catch (error) {
    console.error('Performance report generation error:', error);
    res.status(500).json({ error: 'Failed to generate performance report' });
  }
});

// Helper function to generate sales report HTML
function generateSalesReportHTML(orders, period, startDate, endDate) {
  const periodText = period === 'custom' ? 
    `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}` :
    period.charAt(0).toUpperCase() + period.slice(1);
  
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const totalOrders = orders.length;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>NethwinLK - Sales Report (${periodText})</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { max-width: 200px; height: auto; margin-bottom: 15px; }
            .summary { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .total-section { margin-top: 20px; padding: 15px; background-color: #e8f5e8; border-radius: 8px; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <img src="https://res.cloudinary.com/dz6bntmc6/image/upload/v1758739710/fLogo_xy2tut.png" alt="NethwinLK Logo" class="logo" onerror="this.style.display='none'">
            <h1>NethwinLK - Sales Report</h1>
            <p>Period: ${periodText}</p>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="summary">
            <h2>Summary</h2>
            <p><strong>Total Orders:</strong> ${totalOrders}</p>
            <p><strong>Total Revenue:</strong> Rs. ${totalRevenue.toFixed(2)}</p>
            <p><strong>Average Order Value:</strong> Rs. ${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00'}</p>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Type</th>
                    <th>Customer</th>
                    <th>Items Count</th>
                    <th>Total Amount</th>
                    <th>Payment Method</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${orders.map(order => `
                    <tr>
                        <td>${order.orderNumber || order._id.toString().substring(0, 8)}</td>
                        <td>${order.type === 'print' ? 'Print Order' : 'Book Order'}</td>
                        <td>${order.customerName || 'N/A'}</td>
                        <td>${order.itemsCount}</td>
                        <td>Rs. ${(order.total || 0).toFixed(2)}</td>
                        <td>${order.paymentMethod || 'N/A'}</td>
                        <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="footer">
            <p>Thank you for using NethwinLK Analytics!</p>
            <p>This report was generated automatically by the NethwinLK Admin Dashboard.</p>
        </div>
    </body>
    </html>
  `;
}

// Helper function to generate analytics report HTML
function generateAnalyticsReportHTML(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>NethwinLK - Analytics Report</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { max-width: 200px; height: auto; margin-bottom: 15px; }
            .section { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .metric { display: inline-block; margin: 10px 20px 10px 0; padding: 15px; background-color: #f8f9fa; border-radius: 8px; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <img src="https://res.cloudinary.com/dz6bntmc6/image/upload/v1758739710/fLogo_xy2tut.png" alt="NethwinLK Logo" class="logo" onerror="this.style.display='none'">
            <h1>NethwinLK - Business Analytics Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="section">
            <h2>Key Metrics</h2>
            <div class="metric"><strong>Total Users:</strong> ${data.totalUsers}</div>
            <div class="metric"><strong>Active Users:</strong> ${data.activeUsers}</div>
            <div class="metric"><strong>Total Orders:</strong> ${data.totalOrders}</div>
            <div class="metric"><strong>Completed Orders:</strong> ${data.completedOrders}</div>
            <div class="metric"><strong>Total Revenue:</strong> Rs. ${data.totalRevenue.toFixed(2)}</div>
        </div>
        
        <div class="section">
            <h2>Top Selling Products</h2>
            <table>
                <thead>
                    <tr>
                        <th>Product Name</th>
                        <th>Quantity Sold</th>
                        <th>Revenue</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.topSellingProducts.map(product => `
                        <tr>
                            <td>${product.name}</td>
                            <td>${product.quantity}</td>
                            <td>Rs. ${product.revenue.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            <p>Thank you for using NethwinLK Analytics!</p>
            <p>This report was generated automatically by the NethwinLK Admin Dashboard.</p>
        </div>
    </body>
    </html>
  `;
}

// Helper function to generate performance report HTML
function generatePerformanceReportHTML(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>NethwinLK - Performance Report</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { max-width: 200px; height: auto; margin-bottom: 15px; }
            .section { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
            .metric { display: inline-block; margin: 10px 20px 10px 0; padding: 15px; background-color: #f8f9fa; border-radius: 8px; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <img src="https://res.cloudinary.com/dz6bntmc6/image/upload/v1758739710/fLogo_xy2tut.png" alt="NethwinLK Logo" class="logo" onerror="this.style.display='none'">
            <h1>NethwinLK - Performance Summary</h1>
            <p>Period: ${data.period}</p>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="section">
            <h2>Performance Metrics</h2>
            <div class="metric"><strong>Total Revenue:</strong> Rs. ${data.totalRevenue.toFixed(2)}</div>
            <div class="metric"><strong>Average Order Value:</strong> Rs. ${data.averageOrderValue.toFixed(2)}</div>
            <div class="metric"><strong>Low Stock Products:</strong> ${data.lowStockProducts.length}</div>
        </div>
        
        <div class="section">
            <h2>Payment Method Distribution</h2>
            ${Object.entries(data.paymentMethods).map(([method, count]) => `
                <div class="metric"><strong>${method}:</strong> ${count} orders</div>
            `).join('')}
        </div>
        
        <div class="section">
            <h2>Delivery Method Distribution</h2>
            ${Object.entries(data.deliveryMethods).map(([method, count]) => `
                <div class="metric"><strong>${method}:</strong> ${count} orders</div>
            `).join('')}
        </div>
        
        <div class="footer">
            <p>Thank you for using NethwinLK Analytics!</p>
            <p>This report was generated automatically by the NethwinLK Admin Dashboard.</p>
        </div>
    </body>
    </html>
  `;
}

// Helper functions for Excel generation (placeholder - would need xlsx library)
function generateSalesReportExcel(orders, period, startDate, endDate) {
  // This would use the xlsx library to generate actual Excel files
  // For now, return a simple text representation
  const csvContent = [
    'Order ID,Type,Customer,Items Count,Total Amount,Payment Method,Date',
    ...orders.map(order => [
      order.orderNumber || order._id.toString().substring(0, 8),
      order.type === 'print' ? 'Print Order' : 'Book Order',
      order.customerName || 'N/A',
      order.itemsCount,
      order.total || 0,
      order.paymentMethod || 'N/A',
      new Date(order.createdAt).toLocaleDateString()
    ].join(','))
  ].join('\n');
  
  return Buffer.from(csvContent, 'utf8');
}

function generateAnalyticsReportExcel(data) {
  const csvContent = [
    'Metric,Value',
    `Total Users,${data.totalUsers}`,
    `Active Users,${data.activeUsers}`,
    `Total Orders,${data.totalOrders}`,
    `Completed Orders,${data.completedOrders}`,
    `Total Revenue,${data.totalRevenue}`,
    '',
    'Top Selling Products',
    'Product Name,Quantity Sold,Revenue',
    ...data.topSellingProducts.map(product => [
      product.name,
      product.quantity,
      product.revenue
    ].join(','))
  ].join('\n');
  
  return Buffer.from(csvContent, 'utf8');
}

function generatePerformanceReportExcel(data) {
  const csvContent = [
    'Metric,Value',
    `Total Revenue,${data.totalRevenue}`,
    `Average Order Value,${data.averageOrderValue}`,
    `Low Stock Products,${data.lowStockProducts.length}`,
    '',
    'Payment Methods',
    'Method,Count',
    ...Object.entries(data.paymentMethods).map(([method, count]) => [method, count].join(',')),
    '',
    'Delivery Methods',
    'Method,Count',
    ...Object.entries(data.deliveryMethods).map(([method, count]) => [method, count].join(','))
  ].join('\n');
  
  return Buffer.from(csvContent, 'utf8');
}

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


