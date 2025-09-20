const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dz6bntmc6',
  api_key: '863397561468852',
  api_secret: '7DIR2ow-RGJ1FwgXVX5wBp4jYEA'
});

// Configure Cloudinary storage for hero images
const heroStorage = new CloudinaryStorage({
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

// Create multer upload instance for hero images
const heroUpload = multer({ 
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
