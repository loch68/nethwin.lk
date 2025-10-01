# 🔒 Security Setup Guide

## Environment Variables Configuration

This project now uses environment variables to store sensitive credentials securely.

### Files Created/Modified:
- ✅ `.env` - Contains actual credentials (DO NOT COMMIT)
- ✅ `.env.example` - Template for other developers
- ✅ `.gitignore` - Already includes `.env`
- ✅ `backend/src/config/cloudinary.js` - Updated to use env vars
- ✅ `backend/src/config/hero-cloudinary.js` - Updated to use env vars
- ✅ `backend/server.js` - Updated to use env vars

### Required Environment Variables:

```bash
# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-change-this-in-production

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Admin Configuration
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your-secure-admin-password

# Server Configuration
PORT=3000
NODE_ENV=development
```

### Setup Instructions:

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your actual credentials:**
   ```bash
   nano .env
   ```

3. **Generate a strong JWT secret:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

4. **Update Cloudinary credentials** in your `.env` file

5. **Update MongoDB connection string** with your database credentials

### Security Best Practices:

- ✅ Never commit `.env` files to version control
- ✅ Use strong, unique passwords for all services
- ✅ Rotate secrets regularly in production
- ✅ Use different credentials for development/production
- ✅ Monitor access logs for suspicious activity

### For Production:

1. Set environment variables on your hosting platform
2. Use a secrets management service (AWS Secrets Manager, etc.)
3. Enable MongoDB Atlas IP whitelisting
4. Use Cloudinary signed uploads for additional security
5. Implement rate limiting and monitoring

### Verification:

Run the application and check that:
- ✅ Database connects successfully
- ✅ Cloudinary uploads work
- ✅ JWT tokens are generated properly
- ✅ Admin user can be created

## 🚨 Important Notes:

- The current `.env` file contains your actual credentials
- Make sure `.env` is in `.gitignore` (it already is)
- Never share your `.env` file with anyone
- Use `.env.example` as a template for team members
