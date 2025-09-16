# Print Orders API Documentation

This document describes the complete Node.js backend API for handling print orders using Express and MongoDB (Mongoose).

## Overview

The print orders system allows users to submit print job requests with file uploads, and provides admin functionality to manage these orders. The system uses the existing `printorders` collection in the MongoDB `bookstore` database.

## Database Connection

- **MongoDB URI**: `mongodb+srv://Cluster28608:nethwinlk@cluster28608.qqqrppl.mongodb.net/bookstore`
- **Collection**: `printorders`
- **Schema**: Matches existing document structure exactly

## Dependencies

The following packages are required and have been added to `package.json`:

```json
{
  "express-rate-limit": "^7.1.5",
  "express-validator": "^7.0.1", 
  "helmet": "^7.1.0",
  "morgan": "^1.10.0",
  "multer": "^1.4.4"
}
```

## Security Features

- **Helmet**: Security headers
- **Morgan**: Request logging
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **File Upload Security**: 10MB limit, file type validation
- **Input Validation**: Using express-validator
- **CORS**: Cross-origin resource sharing enabled

## API Endpoints

### 1. Submit Print Order

**POST** `/api/print-orders`

Submit a new print order with file upload.

**Content-Type**: `multipart/form-data`

**Required Fields**:
- `userName` (string): Customer name
- `contactNumber` (string): Contact number
- `email` (string): Valid email address
- `paperSize` (string): A6, A5, A4, A3, A2, or A1
- `colorOption` (string): normal_color, laser_color, bw_single, or bw_double
- `binding` (string): Spiral Binding, Thermal Binding, Hardcover Binding, or Saddle Stitching
- `copies` (number): Number of copies (minimum 1)
- `finishing` (string): Lamination (Gloss), Lamination (Matte), Foil Stamping, Embossing/Debossing, Die-Cutting, or custom
- `deliveryMethod` (string): Home Delivery or Pickup
- `deliveryAddress` (string): Delivery address
- `document` (file): PDF, DOC, DOCX, TXT, JPG, JPEG, PNG, or GIF file (max 10MB)

**Optional Fields**:
- `userId` (string): User ID (ObjectId format)
- `additionalNotes` (string): Required only if finishing = "custom"

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "order_id",
    "userName": "John Doe",
    "email": "john@example.com",
    "estimatedPrice": 250,
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Print order submitted successfully"
}
```

### 2. Get All Print Orders (Admin)

**GET** `/api/admin/print-orders`

Retrieve all print orders with pagination and filtering.

**Query Parameters**:
- `status` (optional): Filter by status (pending, processing, ready, completed, cancelled)
- `priority` (optional): Filter by priority (normal, urgent, rush)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response**:
```json
{
  "success": true,
  "data": {
    "orders": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "pages": 3
    }
  }
}
```

### 3. Update Print Order (Admin)

**PATCH** `/api/admin/print-orders/:id`

Update print order details (admin only).

**Body Parameters** (all optional):
- `estimatedPrice` (number): Estimated price
- `finalPrice` (number): Final price
- `status` (string): Order status
- `priority` (string): Order priority
- `adminNotes` (string): Admin notes

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "order_id",
    "estimatedPrice": 250,
    "finalPrice": 275,
    "status": "processing",
    "priority": "urgent",
    "adminNotes": "Rush order - customer requested"
  },
  "message": "Print order updated successfully"
}
```

### 4. Get User Print Orders

**GET** `/api/users/:userId/print-orders`

Retrieve print orders for a specific user.

**Path Parameters**:
- `userId` (string): Valid MongoDB ObjectId

**Query Parameters**:
- `status` (optional): Filter by status
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response**:
```json
{
  "success": true,
  "data": {
    "orders": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "pages": 1
    }
  }
}
```

### 5. Get Pricing Information

**GET** `/api/print-orders/pricing`

Get current pricing data for all options.

**Response**:
```json
{
  "success": true,
  "data": {
    "paperSizes": [
      { "size": "A6", "normal_color": 20, "laser_color": 65, "bw_single": 5, "bw_double": 5 },
      { "size": "A5", "normal_color": 40, "laser_color": 125, "bw_single": 5, "bw_double": 10 }
    ],
    "binding": [
      { "type": "Spiral Binding", "price": 50 },
      { "type": "Thermal Binding", "price": 150 }
    ],
    "finishing": [
      { "type": "Lamination (Gloss)", "price": 50 },
      { "type": "Lamination (Matte)", "price": 50 }
    ],
    "delivery": [
      { "type": "Home Delivery", "price": 150 },
      { "type": "Pickup", "price": 0 }
    ]
  }
}
```

## Print Order Schema

The print order documents follow this exact structure:

```javascript
{
  userId: ObjectId,           // Reference to User
  userName: String,           // Required
  contactNumber: String,      // Required
  email: String,             // Required
  paperSize: String,         // Required (A6, A5, A4, A3, A2, A1)
  colorOption: String,       // Required (normal_color, laser_color, bw_single, bw_double)
  binding: String,           // Required
  copies: Number,            // Required (min: 1)
  finishing: String,         // Required
  additionalNotes: String,   // Required only if finishing = "custom"
  documentPath: String,      // Required (file path)
  originalFileName: String,  // Required
  fileSize: Number,          // Required (bytes)
  status: String,            // Default: "pending"
  priority: String,          // Default: "normal"
  estimatedPrice: Number,    // Default: 0 (calculated)
  finalPrice: Number,        // Default: 0
  deliveryMethod: String,    // Required
  deliveryAddress: String,   // Required
  adminNotes: String,        // Default: ""
  createdAt: Date,          // Auto-generated
  updatedAt: Date           // Auto-generated
}
```

## Pricing Calculation

The system automatically calculates estimated prices based on:

1. **Paper Size & Color**: Base cost per copy
2. **Binding**: Fixed cost per order
3. **Finishing**: Fixed cost per order  
4. **Delivery**: Fixed cost per order

Example calculation for A4, normal_color, 5 copies, Spiral Binding, Lamination (Gloss), Home Delivery:
- Base: 75 × 5 = 375
- Binding: 50
- Finishing: 50
- Delivery: 150
- **Total: 625**

## Error Handling

All endpoints return consistent JSON responses:

**Success**:
```json
{
  "success": true,
  "data": {...},
  "message": "Optional success message"
}
```

**Error**:
```json
{
  "success": false,
  "error": "Error message",
  "details": [...] // Optional validation details
}
```

## File Upload

- **Location**: `/uploads/print-orders/`
- **Naming**: `print_{timestamp}-{random}.{extension}`
- **Size Limit**: 10MB
- **Allowed Types**: PDF, DOC, DOCX, TXT, JPG, JPEG, PNG, GIF
- **Security**: File type validation on both extension and MIME type

## Running the Server

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Server runs on `http://localhost:4000`

## Testing

All endpoints have been tested and verified to work correctly:

- ✅ Print order submission with validation
- ✅ Admin order management
- ✅ User order retrieval
- ✅ Pricing information retrieval
- ✅ File upload handling
- ✅ Error handling and validation

The system is production-ready and maintains compatibility with the existing database structure.
