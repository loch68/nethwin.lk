NETHWINLK - TEAM MODULES DOCUMENTATION
==========================================

Project: E-commerce & Print Services Platform
Date: January 2025
Status: 75% Complete (Members 2-3, 5), 100% Complete (Members 1, 4)

==========================================
TEAM MEMBER ROLES & RESPONSIBILITIES
==========================================

==========================================
MEMBER 1 - USER HANDLING MODULE (100% COMPLETE)
==========================================

Developer: [Your Name]
Functionality: User Registration, Authentication, Profile Management

DATABASE MODELS:
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

BACKEND API ROUTES:
POST /api/auth/register
POST /api/auth/login
GET /api/me
PUT /api/me
GET /api/users
POST /api/users
PUT /api/users/:id
DELETE /api/users/:id

FRONTEND COMPONENTS:
- Signup Page (signup.html) - Complete registration form with validation
- Login Page (login.html) - User authentication
- Profile Page (profile.html) - User profile management with modern UI
- Admin Users (admin-users.html) - User management for admins

KEY FEATURES IMPLEMENTED:
- User Registration with validation
- User Authentication (JWT tokens)
- Profile Management with phone validation
- Admin User Management (CRUD operations)
- Sri Lankan phone number validation
- Role-based access control
- Password security (bcrypt hashing)
- Mobile-responsive design

==========================================
MEMBER 2 - BOOK LISTING & SEARCH MODULE (75% COMPLETE)
==========================================

Developer: [Team Member Name]
Functionality: Product Catalog, Search & Filtering, Book Management

DATABASE MODELS:
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

BACKEND API ROUTES:
GET /api/products
POST /api/products
PUT /api/products/:id
DELETE /api/products/:id
GET /api/products/search
GET /api/products/category/:category

FRONTEND COMPONENTS:
- Bookshop Page (bookshop.html) - Product catalog display
- Search Page (search.html) - Product search functionality
- Admin Products (admin-products.html) - Product management

COMPLETED FEATURES:
- Product catalog display
- Basic search functionality
- Product CRUD operations
- Image upload system
- Category management
- Stock management

REMAINING 25% - TO IMPLEMENT:
- Advanced search filters (price range, author, category)
- Product pagination (load more/next page)
- Product reviews system
- Wishlist/favorites functionality
- Product comparison feature
- Advanced product image galleries
- Product recommendations

==========================================
MEMBER 3 - CART & CHECKOUT MODULE (75% COMPLETE)
==========================================

Developer: [Team Member Name]
Functionality: Shopping Cart, Order Processing, Payment Integration

DATABASE MODELS:
- userId: ObjectId
- items: [productId, quantity, price]
- totalAmount: Number
- status: String (pending/processing/completed/cancelled)
- shippingAddress: Object
- paymentMethod: String
- createdAt: Date
- updatedAt: Date

BACKEND API ROUTES:
GET /api/cart
POST /api/cart/add
PUT /api/cart/update
DELETE /api/cart/remove
POST /api/orders
GET /api/my-orders
PUT /api/orders/:id/status

FRONTEND COMPONENTS:
- Cart Page (cart.html) - Shopping cart management
- Checkout Page (checkout.html) - Order processing
- Cart Utils (cart-utils.js) - Cart functionality

COMPLETED FEATURES:
- Add/remove items from cart
- Cart quantity management
- Order creation and history
- Order status tracking
- Cart persistence (localStorage)

REMAINING 25% - TO IMPLEMENT:
- Payment integration (Stripe/PayPal)
- Real-time order status updates
- Shipping cost calculator
- Coupon/discount system
- Guest checkout option
- Order modification before processing
- Inventory management during checkout

==========================================
MEMBER 4 - PRINT ON DEMAND MODULE (100% COMPLETE)
==========================================

Developer: [Team Member Name]
Functionality: Custom Printing Services, Print Job Management, File Upload

DATABASE MODELS:
- userId: ObjectId
- fileName: String
- filePath: String
- specifications: {paperSize, paperType, colorMode, quantity, binding}
- totalPrice: Number
- status: String (pending/processing/completed/cancelled)
- createdAt: Date
- updatedAt: Date

BACKEND API ROUTES:
POST /api/print-orders
GET /api/print-orders
GET /api/users/:userId/print-orders
PUT /api/print-orders/:id/status
DELETE /api/print-orders/:id
POST /api/print-orders/upload

FRONTEND COMPONENTS:
- Print Page (print.html) - Print service interface
- Admin Print Orders (admin-print-orders.html) - Print job management

COMPLETED FEATURES:
- File upload system
- Print specifications form
- Print order creation
- Order status tracking
- Admin print job management
- File preview system with full-screen viewing
- Interactive PDF and DOCX previews
- File details display (dimensions, resolution, type)
- Zoom controls for image previews
- Automatic file clearing after order submission
- Multiple file format support (PDF, DOCX, images)
- Professional UI with hover effects and transitions
- Dynamic pricing calculator with real-time updates
- Print job queue management system
- Professional admin dashboard with consistent design

NEWLY IMPLEMENTED FEATURES (January 2025):
- Full-Screen Image Preview: Click any image to view in full-screen modal with zoom controls
- PDF Preview: Click to open PDFs in new tab, full-screen button for dedicated viewing
- DOCX Preview: Click to download DOCX files, full-screen button for viewing
- File Details Panel: Shows file size, type, dimensions, and resolution
- Zoom Functionality: Zoom in/out with buttons and keyboard shortcuts (+/-/0/Escape)
- Auto File Clearing: Uploaded files are automatically cleared after successful order submission
- Enhanced UI: Modern design with dashed borders, hover effects, and clear instructions
- Dynamic Pricing Calculator: Real-time price calculation as users select options
- Print Job Queue Management: Professional admin interface for managing print jobs
- Drag & Drop Reordering: Visual queue management with sortable interface
- Real-time Statistics: Live queue counts, progress tracking, and completion rates
- Priority System: Color-coded urgency levels (urgent, high, normal, low)
- Resource Assignment: Assign jobs to specific printers and operators
- Auto-refresh: Live updates every 5 seconds with manual refresh option
- Consistent Admin Design: Matches other admin panels with sidebar navigation

==========================================
MEMBER 5 - ADMIN DASHBOARD MODULE (75% COMPLETE)
==========================================

Developer: [Team Member Name]
Functionality: Administrative Interface, Analytics, System Management

DATABASE MODELS:
- userCount: Number
- productCount: Number
- orderCount: Number
- revenue: Number
- systemLogs: Array
- settings: Object

BACKEND API ROUTES:
GET /api/admin/dashboard
GET /api/admin/analytics
GET /api/admin/logs
PUT /api/admin/settings
GET /api/admin/reports
POST /api/admin/backup

FRONTEND COMPONENTS:
- Admin Dashboard (admin-dashboard.html) - Main admin interface
- Admin Settings (admin-settings.html) - System configuration
- Admin Messages (admin-messages.html) - Contact message management

COMPLETED FEATURES:
- User management interface
- Basic system statistics
- Settings configuration
- Message management
- Hero image management

REMAINING 25% - TO IMPLEMENT:
- Analytics dashboard with charts
- Advanced system settings
- Email notification system
- Database backup/restore
- System logs viewer
- Bulk operations interface
- Report generation (PDF/Excel)
- Advanced user activity tracking

==========================================
PRIORITY ORDER FOR COMPLETION
==========================================

Phase 1 - Critical Features (Week 1-2):
1. Member 3 - Payment integration (Stripe/PayPal)
2. Member 5 - Analytics dashboard
3. Member 2 - Advanced search filters

Phase 2 - Enhanced Features (Week 3-4):
4. Member 4 - Print job queue management
5. Member 2 - Product reviews system
6. Member 3 - Order tracking improvements

Phase 3 - Advanced Features (Week 5-6):
7. Member 5 - Report generation
8. Member 4 - File preview system
9. Member 2 - Wishlist functionality

==========================================
CURRENT PROJECT STATUS
==========================================

Module                    Completion  Status        Priority
User Handling            100%        Complete      -
Book Listing & Search    75%         In Progress   High
Cart & Checkout          75%         In Progress   Critical
Print On Demand          100%        Complete      -
Admin Dashboard          75%         In Progress   High

==========================================
TECHNICAL STACK
==========================================

Backend:
- Node.js + Express.js
- MongoDB + Mongoose
- JWT Authentication
- Multer (file uploads)
- Cloudinary (image storage)
- bcrypt (password hashing)

Frontend:
- HTML5 + CSS3
- JavaScript (Vanilla)
- Tailwind CSS
- Responsive Design
- Local Storage

Key Features:
- RESTful API Architecture
- JWT-based Authentication
- File Upload System
- Real-time Updates
- Mobile Responsive Design
- Sri Lankan Phone Validation

==========================================
DEVELOPMENT NOTES
==========================================

Completed Recently:
- User profile form redesigned with modern UI
- Phone number validation for Sri Lankan numbers
- Admin user creation with role-based fields
- MongoDB Atlas connection established
- Hero image upload system with local fallback
- Print On Demand module completed (100%)
- File preview system with full-screen viewing
- Interactive PDF/DOCX previews with download functionality
- File details display and zoom controls
- Automatic file clearing after order submission
- Hero image Cloudinary integration (January 2025)
- Fixed hero image URLs to use Cloudinary CDN instead of local paths
- Admin can now upload images from anywhere (local device, downloaded files)
- Images are served globally via Cloudinary CDN for fast loading worldwide
- Proper Cloudinary URL construction and storage
- Bulk Product Upload System (January 2025)
- Excel and ZIP file upload interface for mass product creation
- Automatic image name matching between Excel product names and ZIP image files
- Case-insensitive exact name matching for product-image pairing
- Cloudinary integration for bulk image uploads to global CDN
- Real-time progress tracking and detailed error reporting
- Template validation and data integrity checks
- Support for 130+ products bulk processing with rollback protection
- Fixed Buffer to Data URI conversion for Cloudinary image uploads
- Products without matching images are skipped (schema requires at least one image)
- Fixed pagination limits - admin and user panels now show all products (limit=1000)
- Implemented duplicate product detection - existing products are skipped with warnings
- Fixed form accessibility issues - added autocomplete attributes to file inputs
- Fixed API pagination bug - removed hardcoded 100 product limit, now supports up to 1000
- Clarified database connection - products are saved to MongoDB Atlas cloud database, not local MongoDB
- Bulk Delete Products System (January 2025)
- 2-step confirmation process to prevent accidental deletion
- Step 1: Checkbox confirmation with detailed warning about what will be deleted
- Step 2: Type "DELETE ALL PRODUCTS" to confirm final deletion
- Automatic Cloudinary image cleanup - deletes all associated product images
- Real-time progress tracking with detailed logging
- Comprehensive error handling and rollback protection
- Deletes products from database and images from Cloudinary simultaneously

- Single Product Upload Fix (January 2025)
- Fixed single product image upload to use Cloudinary instead of local storage
- Updated Cloudinary configuration check to properly detect CLOUDINARY_URL
- Fixed Cloudinary upload method from upload_buffer to upload with proper data URI
- Added double-click protection with loading states and button disabling
- Visual feedback during upload process (spinning loader, status messages)
- Prevents duplicate submissions and duplicate image uploads
- Both Add Product and Edit Product forms now have proper loading states

- Search Function Enhancement (January 2025)
- Fixed search function to handle singular/plural category matching
- Now searches for "books" will find products categorized as "book" and vice versa
- Enhanced admin panel, user search, and bookshop search functionality
- Added category mappings for books/book, pens/pen, toys/toy
- No need to change Excel files or database - search is now intelligent
- Resolves inconsistency between Excel categories (plural) and database categories (singular)
- All search functions now work consistently across the entire application

- User Data Export Feature (January 2025)
- Added comprehensive user data export functionality to User Handling module
- CSV export for all users with fields: UserID, Full Name, Email, Phone, Role, Status, CreatedAt, LastLogin
- PDF export for all users with professional formatting and tables
- Individual profile PDF export with detailed personal info and order history
- Export buttons added to admin-users.html (bulk export) and profile.html (individual export)
- Backend endpoints: /api/users/export/csv, /api/users/export/pdf, /api/users/:id/export/pdf
- Proper error handling, loading states, and success notifications
- Automatic file download with timestamped filenames
- Professional PDF formatting with tables, headers, and styling

Next Steps:
1. Implement payment integration for checkout
2. Add analytics dashboard with charts
3. Enhance search functionality with filters
4. Improve print job management system
5. Add comprehensive admin reporting

==========================================
RECENT FIXES & UPDATES
==========================================

- Fixed single product upload to use Cloudinary instead of local storage
- Added double-click protection for product forms to prevent duplicate submissions
- Enhanced search function to handle singular/plural category mismatches (book vs books)
- Implemented User Data Export Feature with CSV and PDF generation
- Fixed cart summary export 500 error by adding null checks for cart data
- Updated all report endpoints to use Cloudinary logo URL for professional branding
- Implemented Product Catalog and Low Stock Report exports (Excel/PDF)
- Added Cart Summary and Automatic Invoice generation features
- All reports now feature the professional Nethwin logo from Cloudinary
- Implemented Print On Demand downloadable reports:
  * Individual Print Job Quotation download in profile.html
  * Admin export of all print jobs as CSV/PDF in admin-print-orders.html
  * Backend API endpoints for print job exports with professional branding
- Fixed pricing discrepancy between frontend display and backend storage:
  * Frontend now sends calculated estimated price to backend
  * Backend uses frontend price if provided, falls back to backend calculation
  * Resolves 150 LKR difference in delivery pricing between frontend and backend
- Implemented Dynamic Delivery Pricing System:
  * Admin can change delivery price in admin-settings.html
  * All existing pending/in_queue print orders automatically updated when price changes
  * Frontend print.html fetches current delivery price from API
  * Cart.html and checkout.html now use dynamic delivery pricing from API
  * Delivery option cards now display dynamic price and radius from API (not hardcoded)
  * Fixed delivery address prompt appearing on cart page (now only on checkout page)
  * Fixed delivery option cards to have equal heights and prevent color overlap
  * Fixed delivery option card circles to show relevant colors when selected (green for Local Delivery, blue for Store Pickup)
  * Fixed delivery option card circles to stay colored when selected, not just on hover
  * Enhanced profile.html with mobile-friendly quotation download buttons for better user experience
  * Added bookshop order quotation download functionality with green "Quote" buttons for both desktop and mobile
  * Fixed checkout.html delivery fee calculation - Store Pickup now correctly shows Rs. 0.00 delivery fee
  * Fixed delivery fee accumulation bug - switching between delivery methods now properly recalculates instead of adding fees
  * Fixed checkout form validation error - added missing name attributes to all form fields to prevent "An invalid form control with name='' is not focusable" error
  * Fixed delivery address validation - textarea is now only required when Local Delivery is selected, preventing form submission errors
  * Added navigation buttons to order-confirmation.html - "Go to Home" and "Continue Shopping" buttons for better user experience
  * Extended Admin Dashboard with comprehensive analytics and reports system:
    - Sales Reports: Daily, Monthly, Yearly, and Custom Date Range exports
    - Analytics Reports: Business overview with key metrics and top-selling products
    - Performance Reports: 30-day performance summary with payment/delivery distributions
    - Multiple formats: PDF (HTML) and Excel (CSV) downloads
    - Professional report templates with NethwinLK branding
    - Real-time data from MongoDB using actual database column names
    - Enhanced UI with gradient cards, hover animations, and modern design
    - Fixed JavaScript errors and improved button functionality
    - Server restart implemented to ensure API endpoints are properly loaded
    - Fixed Excel file generation - now properly generates CSV files instead of corrupted Excel files
    - Improved button placement and UX - full-width buttons with proper icons and spacing
    - Updated all report buttons to use vertical layout with better visual hierarchy
    - Redesigned analytics layout - moved custom date selector to prominent top bar
    - Enlarged report cards with better spacing and improved visual hierarchy
    - Enhanced card design with larger padding, bigger icons, and better button alignment
    - Implemented automatic refresh mechanism for report download buttons
    - Added timeout fallback (30 seconds) to prevent stuck "Generating..." state
    - Auto-refresh button state after successful download (2-second delay)
    - Immediate button state restoration on errors
  * Real-time price updates across all pages and reports
  * Database-driven delivery settings with automatic order recalculation
  * Event-driven updates: cart and checkout pages refresh when admin changes delivery price

==========================================
CONTACT & SUPPORT
==========================================

For questions about specific modules or technical implementation, refer to the respective team member or check the codebase documentation in each module's folder.

Last Updated: January 2025
Document Version: 1.0
