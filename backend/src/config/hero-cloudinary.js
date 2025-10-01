const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Cloudinary
if (process.env.CLOUDINARY_URL) {
  cloudinary.config();
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
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

// Debug: Check if Cloudinary is configured
if (process.env.NODE_ENV === 'development') {
  console.log('Cloudinary configuration check:');
  console.log('- CLOUDINARY_URL:', process.env.CLOUDINARY_URL ? 'Set' : 'Not set');
  console.log('- isCloudinaryConfigured:', !!isCloudinaryConfigured);
}


let heroStorage;
let heroUpload;

if (isCloudinaryConfigured) {
  // Configure Cloudinary storage for hero images
  heroStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'nethwinlk/hero-images',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: [
        { width: 1920, height: 1080, crop: 'fill', quality: 'auto', fetch_format: 'auto' },
        { width: 1200, height: 675, crop: 'fill', quality: 'auto', fetch_format: 'auto' }, // Mobile optimized
        { width: 800, height: 450, crop: 'fill', quality: 'auto', fetch_format: 'auto' }   // Small mobile
      ]
    }
  });
} else {
  // Fallback to local storage
  const heroStorageDir = path.join(__dirname, '..', '..', 'uploads', 'hero-images');
  if (!fs.existsSync(heroStorageDir)) {
    fs.mkdirSync(heroStorageDir, { recursive: true });
  }
  
  heroStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, heroStorageDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'hero_' + uniqueSuffix + path.extname(file.originalname));
    }
  });
}

// Create multer upload instance for hero images
heroUpload = multer({ 
  storage: heroStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for hero images
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

module.exports = {
  cloudinary,
  heroUpload
};
