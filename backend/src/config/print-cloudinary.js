const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');

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

// Configure Cloudinary storage for print order uploads
const printOrderStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'nethwinlk/print-orders',
    allowed_formats: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif'],
    resource_type: 'auto', // Allow both image and raw file uploads
    transformation: [
      { quality: 'auto' },
      { fetch_format: 'auto' }
    ]
  }
});

// Create multer upload instance for print orders
const printOrderUpload = multer({ 
  storage: printOrderStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for print orders
  },
  fileFilter: (req, file, cb) => {
    // Allow common document formats
    const allowedTypes = /pdf|doc|docx|txt|jpg|jpeg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, TXT, JPG, JPEG, PNG, and GIF files are allowed'), false);
    }
  }
});

module.exports = {
  cloudinary,
  printOrderUpload
};
