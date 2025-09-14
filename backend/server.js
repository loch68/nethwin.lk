require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://Cluster28608:nethwinlk@cluster28608.qqqrppl.mongodb.net/bookstore';
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

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// GET /api/products?search=&page=1&limit=20
app.get('/api/products', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const search = (req.query.search || '').trim();

    const filters = {};
    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
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
    const created = await Product.create({
      name: body.name,
      description: body.description || '',
      image: body.image || '',
      price: body.price || body.sellingPrice || 0,
      sellingPrice: body.sellingPrice || body.price || 0,
      unitPurchasePrice: body.unitPurchasePrice || 0,
      discount: body.discount || 0,
      sku: body.sku || '',
      brand: body.brand || '',
      category: body.category || '',
      productType: body.productType || 'Single',
      tax: body.tax || 0,
      businessLocation: body.businessLocation || '',
      availability: body.availability || 'in_stock',
      currentStock: body.currentStock || 0,
      status: body.status || 'active',
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
      name: p.name,
      description: p.description || '',
      image: p.image || '',
      price: p.price || p.sellingPrice || 0,
      sellingPrice: p.sellingPrice || p.price || 0,
      unitPurchasePrice: p.unitPurchasePrice || 0,
      discount: p.discount || 0,
      sku: p.sku || '',
      brand: p.brand || '',
      category: p.category || '',
      productType: p.productType || 'Single',
      tax: p.tax || 0,
      businessLocation: p.businessLocation || '',
      availability: p.availability || 'in_stock',
      currentStock: p.currentStock || 0,
      status: p.status || 'active',
    }));
    const created = await Product.insertMany(docs);
    res.json({ inserted: created.length });
  } catch (err) {
    console.error('POST /api/products/import error', err.message);
    res.status(400).json({ error: 'Import failed' });
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
    const toCreate = {
      type: body.type || 'shop',
      items: Array.isArray(body.items) ? body.items : [],
      total: typeof body.total === 'number' ? body.total : 0,
      status: body.status || 'to-fulfill',
      customerName: body.customerName || '',
      customerEmail: body.customerEmail || '',
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

// Reviews CRUD
app.get('/api/reviews', async (req, res) => {
  const reviews = await Review.find({}).sort({ createdAt: -1 }).lean();
  res.json({ reviews });
});
app.post('/api/reviews', async (req, res) => {
  try { const r = await Review.create(req.body || {}); res.status(201).json(r); } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/reviews/:id', async (req, res) => {
  try { const del = await Review.findByIdAndDelete(req.params.id).lean(); if (!del) return res.status(404).json({ error: 'Not found' }); res.json({ success: true }); } catch (e) { res.status(400).json({ error: e.message }); }
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
    res.json({ user: { _id: user._id, fullName: user.fullName, email: user.email, phone: user.phone, status: user.status } });
  } catch (e) { res.status(401).json({ error: 'Unauthorized' }); }
});

app.put('/api/me', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const payload = require('jsonwebtoken').verify(token, JWT_SECRET);
    const updates = { fullName: req.body?.fullName, phone: req.body?.phone };
    const updated = await User.findByIdAndUpdate(payload.sub, { $set: updates }, { new: true }).lean();
    res.json({ user: { _id: updated._id, fullName: updated.fullName, email: updated.email, phone: updated.phone, status: updated.status } });
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

    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await User.create({
      fullName: 'Admin User',
      email: 'admin@nethwin.com',
      username: 'admin',
      passwordHash: hashedPassword,
      role: 'admin',
      status: 'active'
    });

    res.json({ message: 'Admin user created successfully', email: 'admin@nethwin.com', password: 'admin123' });
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


