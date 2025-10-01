// Main configuration file
require('dotenv').config({ path: '../../.env' });

const config = {
  // Database Configuration
  database: {
    uri: process.env.MONGODB_URI
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '24h'
  },

  // Cloudinary Configuration
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    isConfigured: process.env.CLOUDINARY_CLOUD_NAME && 
                  process.env.CLOUDINARY_CLOUD_NAME !== 'your-cloudinary-cloud-name' &&
                  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
                  process.env.CLOUDINARY_API_KEY && 
                  process.env.CLOUDINARY_API_KEY !== 'your-cloudinary-api-key' &&
                  process.env.CLOUDINARY_API_KEY !== 'your_api_key' &&
                  process.env.CLOUDINARY_API_SECRET && 
                  process.env.CLOUDINARY_API_SECRET !== 'your-cloudinary-api-secret' &&
                  process.env.CLOUDINARY_API_SECRET !== 'your_api_secret'
  },

  // Admin Configuration
  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD
  },

  // Server Configuration
  server: {
    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV
  }
};

module.exports = config;
