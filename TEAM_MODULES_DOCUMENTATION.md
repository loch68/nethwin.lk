# NethwinLK - Team Modules Documentation

**Project:** E-commerce & Print Services Platform  
**Date:** January 2025  
**Status:** 75% Complete (Members 2-3, 5), 100% Complete (Members 1, 4)

---

## 📋 **TEAM MEMBER ROLES & RESPONSIBILITIES**

---

## 👤 **MEMBER 1 - USER HANDLING MODULE** ✅ **100% COMPLETE**

**Developer:** [Your Name]  
**Functionality:** User Registration, Authentication, Profile Management  

### **🗄️ DATABASE MODELS**
```javascript
// User Model (/backend/src/models/User.js)
- username: String
- email: String  
- password: String (hashed)
- fullName: String
- phoneNumber: String
- address: String
- province: String
- district: String
- city: String
- zipCode: String
- role: String (customer/admin)
- customerType: String (online/instore)
- status: String (active/inactive)
- createdAt: Date
- updatedAt: Date
```

### **🔧 BACKEND API ROUTES**
```javascript
// Authentication Routes
POST /api/auth/register
POST /api/auth/login
GET /api/me
PUT /api/me
GET /api/users
POST /api/users
PUT /api/users/:id
DELETE /api/users/:id
```

### **💻 FRONTEND COMPONENTS**
- **Signup Page** (`signup.html`) - Complete registration form with validation
- **Login Page** (`login.html`) - User authentication
- **Profile Page** (`profile.html`) - User profile management with modern UI
- **Admin Users** (`admin-users.html`) - User management for admins

### **🎯 KEY FEATURES IMPLEMENTED**
- ✅ User Registration with validation
- ✅ User Authentication (JWT tokens)
- ✅ Profile Management with phone validation
- ✅ Admin User Management (CRUD operations)
- ✅ Sri Lankan phone number validation
- ✅ Role-based access control
- ✅ Password security (bcrypt hashing)
- ✅ Mobile-responsive design

---

## 📚 **MEMBER 2 - BOOK LISTING & SEARCH MODULE** ⚠️ **75% COMPLETE**

**Developer:** [Team Member Name]  
**Functionality:** Product Catalog, Search & Filtering, Book Management  

### **🗄️ DATABASE MODELS**
```javascript
// Product Model (/backend/src/models/Product.js)
- name: String
- description: String
- price: Number
- category: String
- author: String
- isbn: String
- stock: Number
- imageUrl: String
- status: String (active/inactive)
- createdAt: Date
- updatedAt: Date
```

### **🔧 BACKEND API ROUTES**
```javascript
// Product Routes
GET /api/products
POST /api/products
PUT /api/products/:id
DELETE /api/products/:id
GET /api/products/search
GET /api/products/category/:category
```

### **💻 FRONTEND COMPONENTS**
- **Bookshop Page** (`bookshop.html`) - Product catalog display
- **Search Page** (`search.html`) - Product search functionality
- **Admin Products** (`admin-products.html`) - Product management

### **✅ COMPLETED FEATURES**
- ✅ Product catalog display
- ✅ Basic search functionality
- ✅ Product CRUD operations
- ✅ Image upload system
- ✅ Category management
- ✅ Stock management

### **❌ REMAINING 25% - TO IMPLEMENT**
- 🔲 Advanced search filters (price range, author, category)
- 🔲 Product pagination (load more/next page)
- 🔲 Product reviews system
- 🔲 Wishlist/favorites functionality
- 🔲 Product comparison feature
- 🔲 Advanced product image galleries
- 🔲 Product recommendations

---

## 🛒 **MEMBER 3 - CART & CHECKOUT MODULE** ⚠️ **75% COMPLETE**

**Developer:** [Team Member Name]  
**Functionality:** Shopping Cart, Order Processing, Payment Integration  

### **🗄️ DATABASE MODELS**
```javascript
// Order Model (/backend/src/models/Order.js)
- userId: ObjectId
- items: [{
    productId: ObjectId,
    quantity: Number,
    price: Number
  }]
- totalAmount: Number
- status: String (pending/processing/completed/cancelled)
- shippingAddress: Object
- paymentMethod: String
- createdAt: Date
- updatedAt: Date
```

### **🔧 BACKEND API ROUTES**
```javascript
// Cart & Order Routes
GET /api/cart
POST /api/cart/add
PUT /api/cart/update
DELETE /api/cart/remove
POST /api/orders
GET /api/my-orders
PUT /api/orders/:id/status
```

### **💻 FRONTEND COMPONENTS**
- **Cart Page** (`cart.html`) - Shopping cart management
- **Checkout Page** (`checkout.html`) - Order processing
- **Cart Utils** (`cart-utils.js`) - Cart functionality

### **✅ COMPLETED FEATURES**
- ✅ Add/remove items from cart
- ✅ Cart quantity management
- ✅ Order creation and history
- ✅ Order status tracking
- ✅ Cart persistence (localStorage)

### **❌ REMAINING 25% - TO IMPLEMENT**
- 🔲 Payment integration (Stripe/PayPal)
- 🔲 Real-time order status updates
- 🔲 Shipping cost calculator
- 🔲 Coupon/discount system
- 🔲 Guest checkout option
- 🔲 Order modification before processing
- 🔲 Inventory management during checkout

---

## 🖨️ **MEMBER 4 - PRINT ON DEMAND MODULE** ✅ **100% COMPLETE**

**Developer:** [Team Member Name]  
**Functionality:** Custom Printing Services, Print Job Management, File Upload  

### **🗄️ DATABASE MODELS**
```javascript
// PrintOrder Model (/backend/src/models/PrintOrder.js)
- userId: ObjectId
- fileName: String
- filePath: String
- specifications: {
    paperSize: String,
    paperType: String,
    colorMode: String,
    quantity: Number,
    binding: String
  }
- totalPrice: Number
- status: String (pending/processing/completed/cancelled)
- createdAt: Date
- updatedAt: Date
```

### **🔧 BACKEND API ROUTES**
```javascript
// Print Order Routes
POST /api/print-orders
GET /api/print-orders
GET /api/users/:userId/print-orders
PUT /api/print-orders/:id/status
DELETE /api/print-orders/:id
POST /api/print-orders/upload

// Print Job Queue Management Routes
GET /api/print-orders/queue - Get print job queue with filtering
PUT /api/print-orders/:id/priority - Update job priority
PUT /api/print-orders/:id/status - Update job status and progress
POST /api/print-orders/reorder - Reorder queue positions
GET /api/print-orders/queue/stats - Get queue statistics
PUT /api/print-orders/:id/assign - Assign job to printer/operator
```

### **💻 FRONTEND COMPONENTS**
- **Print Page** (`print.html`) - Print service interface with dynamic pricing
- **Admin Print Orders** (`admin-print-orders.html`) - Print job management
- **Admin Print Queue** (`admin-print-queue.html`) - Professional queue management dashboard

### **✅ COMPLETED FEATURES**
- ✅ File upload system
- ✅ Print specifications form
- ✅ Print order creation
- ✅ Order status tracking
- ✅ Admin print job management
- ✅ **File preview system with full-screen viewing**
- ✅ **Interactive PDF and DOCX previews**
- ✅ **File details display (dimensions, resolution, type)**
- ✅ **Zoom controls for image previews**
- ✅ **Automatic file clearing after order submission**
- ✅ **Multiple file format support (PDF, DOCX, images)**
- ✅ **Professional UI with hover effects and transitions**
- ✅ **Dynamic pricing calculator with real-time updates**
- ✅ **Print job queue management system**
- ✅ **Professional admin dashboard with consistent design**

### **🎯 NEWLY IMPLEMENTED FEATURES (January 2025)**
- **Full-Screen Image Preview**: Click any image to view in full-screen modal with zoom controls
- **PDF Preview**: Click to open PDFs in new tab, full-screen button for dedicated viewing
- **DOCX Preview**: Click to download DOCX files, full-screen button for viewing
- **File Details Panel**: Shows file size, type, dimensions, and resolution
- **Zoom Functionality**: Zoom in/out with buttons and keyboard shortcuts (+/-/0/Escape)
- **Auto File Clearing**: Uploaded files are automatically cleared after successful order submission
- **Enhanced UI**: Modern design with dashed borders, hover effects, and clear instructions
- **Dynamic Pricing Calculator**: Real-time price calculation as users select options
- **Print Job Queue Management**: Professional admin interface for managing print jobs
- **Drag & Drop Reordering**: Visual queue management with sortable interface
- **Real-time Statistics**: Live queue counts, progress tracking, and completion rates
- **Priority System**: Color-coded urgency levels (urgent, high, normal, low)
- **Resource Assignment**: Assign jobs to specific printers and operators
- **Auto-refresh**: Live updates every 5 seconds with manual refresh option
- **Consistent Admin Design**: Matches other admin panels with sidebar navigation

---

## 👨‍💼 **MEMBER 5 - ADMIN DASHBOARD MODULE** ⚠️ **75% COMPLETE**

**Developer:** [Team Member Name]  
**Functionality:** Administrative Interface, Analytics, System Management  

### **🗄️ DATABASE MODELS**
```javascript
// Analytics & System Data
- userCount: Number
- productCount: Number
- orderCount: Number
- revenue: Number
- systemLogs: Array
- settings: Object
```

### **🔧 BACKEND API ROUTES**
```javascript
// Admin Dashboard Routes
GET /api/admin/dashboard
GET /api/admin/analytics
GET /api/admin/logs
PUT /api/admin/settings
GET /api/admin/reports
POST /api/admin/backup
```

### **💻 FRONTEND COMPONENTS**
- **Admin Dashboard** (`admin-dashboard.html`) - Main admin interface
- **Admin Settings** (`admin-settings.html`) - System configuration
- **Admin Messages** (`admin-messages.html`) - Contact message management

### **✅ COMPLETED FEATURES**
- ✅ User management interface
- ✅ Basic system statistics
- ✅ Settings configuration
- ✅ Message management
- ✅ Hero image management

### **❌ REMAINING 25% - TO IMPLEMENT**
- 🔲 Analytics dashboard with charts
- 🔲 Advanced system settings
- 🔲 Email notification system
- 🔲 Database backup/restore
- 🔲 System logs viewer
- 🔲 Bulk operations interface
- 🔲 Report generation (PDF/Excel)
- 🔲 Advanced user activity tracking

---

## 🎯 **PRIORITY ORDER FOR COMPLETION**

### **Phase 1 - Critical Features (Week 1-2)**
1. **Member 3** - Payment integration (Stripe/PayPal)
2. **Member 5** - Analytics dashboard
3. **Member 2** - Advanced search filters

### **Phase 2 - Enhanced Features (Week 3-4)**
4. **Member 4** - Print job queue management
5. **Member 2** - Product reviews system
6. **Member 3** - Order tracking improvements

### **Phase 3 - Advanced Features (Week 5-6)**
7. **Member 5** - Report generation
8. **Member 4** - File preview system
9. **Member 2** - Wishlist functionality

---

## 📊 **CURRENT PROJECT STATUS**

| Module | Completion | Status | Priority |
|--------|------------|--------|----------|
| User Handling | 100% | ✅ Complete | - |
| Book Listing & Search | 75% | ⚠️ In Progress | High |
| Cart & Checkout | 75% | ⚠️ In Progress | Critical |
| Print On Demand | 100% | ✅ Complete | - |
| Admin Dashboard | 75% | ⚠️ In Progress | High |

---

## 🔧 **TECHNICAL STACK**

### **Backend**
- Node.js + Express.js
- MongoDB + Mongoose
- JWT Authentication
- Multer (file uploads)
- Cloudinary (image storage)
- bcrypt (password hashing)

### **Frontend**
- HTML5 + CSS3
- JavaScript (Vanilla)
- Tailwind CSS
- Responsive Design
- Local Storage

### **Key Features**
- RESTful API Architecture
- JWT-based Authentication
- File Upload System
- Real-time Updates
- Mobile Responsive Design
- Sri Lankan Phone Validation

---

## 📝 **DEVELOPMENT NOTES**

### **Completed Recently**
- ✅ User profile form redesigned with modern UI
- ✅ Phone number validation for Sri Lankan numbers
- ✅ Admin user creation with role-based fields
- ✅ MongoDB Atlas connection established
- ✅ Hero image upload system with local fallback
- ✅ **Print On Demand module completed (100%)**
- ✅ **File preview system with full-screen viewing**
- ✅ **Interactive PDF/DOCX previews with download functionality**
- ✅ **File details display and zoom controls**
- ✅ **Automatic file clearing after order submission**

### **Next Steps**
1. Implement payment integration for checkout
2. Add analytics dashboard with charts
3. Enhance search functionality with filters
4. Improve print job management system
5. Add comprehensive admin reporting

---

## 📞 **CONTACT & SUPPORT**

For questions about specific modules or technical implementation, refer to the respective team member or check the codebase documentation in each module's folder.

**Last Updated:** January 2025  
**Document Version:** 1.0
