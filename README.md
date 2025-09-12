# NethwinLK - Online Bookshop & Print Services

A comprehensive e-commerce platform for books and print-on-demand services, developed by a team of 5 developers.

## 🚀 Features

- **User Authentication System** - Secure login, registration, and profile management
- **Book Catalog & Search** - Comprehensive product listing with advanced search and filtering
- **Shopping Cart & Checkout** - Complete e-commerce functionality with order management
- **Print-on-Demand Services** - Custom printing services for business cards, banners, and documents
- **Admin Dashboard** - Comprehensive administrative interface with analytics and management tools

## 👥 Team Members

| Member | Role | Responsibility |
|--------|------|----------------|
| **Lochana** | Frontend Developer | User Authentication & Profile Management |
| **Thevindu** | Full-Stack Developer | Book Catalog & Search Functionality |
| **Theekshana** | Backend Developer | Shopping Cart & Order Processing |
| **Nelithra** | Frontend Developer | Print Services & File Upload |
| **Oneka** | Full-Stack Developer | Admin Dashboard & Analytics |

## 🛠️ Technology Stack

- **Frontend:** HTML5, CSS3, JavaScript, Tailwind CSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT (JSON Web Tokens)
- **File Upload:** Multer
- **Password Hashing:** bcrypt

## 📁 Project Structure

```
frontend-project/
├── html/                    # Frontend pages
│   ├── index.html          # Landing page
│   ├── login.html          # User authentication (Sarah)
│   ├── bookshop.html       # Product catalog (Michael)
│   ├── cart.html           # Shopping cart (Emily)
│   ├── print.html          # Print services (David)
│   └── admin-dashboard.html # Admin interface (Jessica)
├── backend/                 # Backend API
│   ├── server.js           # Main server file
│   ├── models/             # Database models
│   └── src/                # Source files
├── css/                    # Stylesheets
├── assets/                 # Images and media
└── javascript/             # Frontend scripts
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd frontend-project
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your MongoDB connection string
```

4. Start the development server:
```bash
npm start
```

5. Access the application:
- Main website: `http://localhost:4000/html/index.html`
- Admin dashboard: `http://localhost:4000/html/admin-dashboard.html`


## 📊 Module Breakdown

### User Authentication (Lochana)
- User registration and login
- Profile management
- JWT-based authentication
- Admin user management

### Book Catalog (Thevindu)
- Product listing and search
- Category filtering
- Product detail pages
- Admin product management

### Shopping Cart (Theekshana)
- Add/remove items from cart
- Order processing
- Checkout functionality
- Order history and tracking

### Print Services (Nelithra)
- Custom print job creation
- File upload handling
- Print job status tracking
- Service pricing calculator

### Admin Dashboard (Oneka)
- System analytics and statistics
- User management interface
- Order and product oversight
- Multi-module administration

## 🤝 Contributing

This project was developed collaboratively by our 5-member team. Each member was responsible for their designated module while ensuring seamless integration across the platform.

