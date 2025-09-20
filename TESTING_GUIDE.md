# 🧪 Print Orders System Testing Guide

This guide will help you test the print orders system, including file uploads, email notifications, and document viewing.

## 🚀 Quick Start

### 1. Start the Server
```bash
cd backend
npm start
# or
node server.js
```

### 2. Run Automated Tests
```bash
cd backend
node test-print-orders.js
```

## 📋 Manual Testing Steps

### Step 1: User Registration & Login
1. Go to `http://localhost:4000/html/signup.html`
2. Create a new user account
3. Note down the email and password
4. Go to `http://localhost:4000/html/login.html`
5. Login with the created account

### Step 2: Submit Print Order
1. Go to `http://localhost:4000/html/print.html`
2. Fill out the print order form:
   - **Paper Size**: A4
   - **Color Option**: Color
   - **Binding**: Stapled
   - **Copies**: 5
   - **Finishing**: Matte
   - **Additional Notes**: Test order
3. Upload a test document (PDF, DOC, DOCX, JPG, or PNG)
4. Click "Submit Print Order"
5. You should see a success message

### Step 3: Check Email Notifications
The system sends two emails:
- **Print Shop Notification**: Sent to `lochana211@gmail.com` (or configured email)
- **Customer Confirmation**: Sent to the user's email

Check your email inbox for:
- Order details
- Customer information
- Document attachment (in shop notification)

### Step 4: View Orders as User
1. Go to `http://localhost:4000/html/profile.html`
2. Check the orders section
3. You should see your print order listed

### Step 5: Admin Dashboard
1. Go to `http://localhost:4000/html/admin-login.html`
2. Login as admin (create admin user if needed)
3. Go to `http://localhost:4000/html/admin-print-orders.html`
4. View all print orders
5. Click "View Document" to see uploaded files

## 🔧 Admin User Setup

If you don't have an admin user, create one:

### Method 1: Database Direct
```javascript
// In MongoDB, update a user to have admin role
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

### Method 2: Code Modification
Temporarily modify the signup endpoint to create admin users:
```javascript
// In server.js, modify the signup endpoint
if (email === 'admin@nethwinlk.com') {
  user.role = 'admin';
}
```

## 📧 Email Configuration

### For Production (Recommended)
Set these environment variables:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
PRINT_SHOP_EMAIL=lochana211@gmail.com
```

### For Testing (Development)
The system uses `jsonTransport` by default, which logs emails to console instead of sending them.

## 🗂️ File Upload Testing

### Test Different File Types
1. **PDF**: Upload a PDF document
2. **DOC/DOCX**: Upload a Word document
3. **JPG/PNG**: Upload an image file

### Test File Size Limits
- Maximum file size: 10MB
- Maximum files per request: 5
- Try uploading files larger than 10MB to test error handling

### Test Invalid Files
- Try uploading .exe, .zip, or other unsupported files
- Should get validation error

## 🔍 API Testing with curl

### 1. User Registration
```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "fullName": "Test User",
    "email": "test@example.com",
    "password": "testpass123",
    "phoneNumber": "0771234567"
  }'
```

### 2. User Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }'
```

### 3. File Upload
```bash
curl -X POST http://localhost:4000/api/print-orders/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document=@/path/to/test-file.pdf"
```

### 4. Create Print Order
```bash
curl -X POST http://localhost:4000/api/print-orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "paperSize": "A4",
    "colorOption": "Color",
    "binding": "Stapled",
    "copies": 5,
    "finishing": "Matte",
    "additionalNotes": "Test order",
    "documentPath": "uploads/print-orders/print_1234567890.pdf",
    "originalFileName": "test-file.pdf",
    "fileSize": 1024000,
    "deliveryMethod": "pickup"
  }'
```

### 5. Get User Orders
```bash
curl -X GET http://localhost:4000/api/my-orders-all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6. Get Admin Orders
```bash
curl -X GET http://localhost:4000/api/admin/print-orders \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 7. View Document
```bash
curl -X GET http://localhost:4000/api/admin/print-orders/ORDER_ID/document \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## 🐛 Troubleshooting

### Common Issues

#### 1. "No file uploaded" Error
- Check if file is properly attached to form
- Verify file size is under 10MB
- Check file type is supported

#### 2. "Authentication failed" Error
- Verify JWT token is valid
- Check if token is properly formatted: `Bearer TOKEN`
- Ensure user is logged in

#### 3. "Admin access required" Error
- Verify user has admin role
- Check if admin user exists in database

#### 4. Email Notifications Not Working
- Check SMTP configuration
- Verify email credentials
- Check server logs for email errors

#### 5. Document Not Found Error
- Check if file exists in uploads directory
- Verify file path in database
- Check file permissions

### Debug Mode

Enable debug logging by setting:
```bash
NODE_ENV=development
```

This will show detailed error messages in the console.

## 📊 Expected Results

### Successful Print Order Submission
```json
{
  "success": true,
  "printOrder": {
    "id": "order_id",
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "emailNotifications": {
    "shopNotification": {
      "sent": true,
      "messageId": "email_id"
    },
    "customerConfirmation": {
      "sent": true,
      "messageId": "email_id"
    }
  }
}
```

### File Upload Success
```json
{
  "success": true,
  "file": {
    "path": "uploads/print-orders/print_1234567890.pdf",
    "originalName": "test-file.pdf",
    "size": 1024000,
    "mimetype": "application/pdf"
  }
}
```

## 🎯 Testing Checklist

- [ ] User can register and login
- [ ] User can submit print order with file upload
- [ ] File upload validates file types and sizes
- [ ] Email notifications are sent (check inbox)
- [ ] User can view their orders
- [ ] Admin can view all orders
- [ ] Admin can view uploaded documents
- [ ] Error handling works for invalid inputs
- [ ] Rate limiting works for multiple requests
- [ ] File security prevents malicious uploads

## 📁 File Locations

- **Uploaded Files**: `backend/uploads/print-orders/`
- **Test Script**: `backend/test-print-orders.js`
- **Admin Page**: `html/admin-print-orders.html`
- **Server Logs**: Check console output

## 🔒 Security Testing

- Try uploading malicious files
- Test rate limiting by making many requests
- Test authentication with invalid tokens
- Test admin access with regular user tokens
- Test file size and type validation

Happy Testing! 🚀
