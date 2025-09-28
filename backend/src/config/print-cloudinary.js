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
  params: (req, file) => {
    // Determine resource type based on file type
    const isImage = file.mimetype.startsWith('image/');
    const resourceType = isImage ? 'image' : 'raw';
    
    console.log('Cloudinary upload params:', {
      filename: file.originalname,
      mimetype: file.mimetype,
      resourceType: resourceType
    });
    
    // Generate unique public ID with file extension
    const fileExtension = file.originalname.split('.').pop();
    const publicId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
    
    const params = {
      folder: 'nethwinlk/print-orders',
      resource_type: resourceType,
      public_id: publicId,
      access_mode: 'public' // Make files publicly accessible
    };
    
    console.log('Final Cloudinary params:', params);
    return params;
  }
});

// Create multer upload instance for print orders
const printOrderUpload = multer({ 
  storage: printOrderStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for print orders (reduced for faster uploads)
  },
  fileFilter: (req, file, cb) => {
    console.log('Multer fileFilter called with:', {
      filename: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });
    
    // Allow common document formats
    const allowedExtensions = /\.(pdf|doc|docx|txt|jpg|jpeg|png|gif)$/i;
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif'
    ];
    
    const hasValidExtension = allowedExtensions.test(file.originalname);
    const hasValidMimeType = allowedMimeTypes.includes(file.mimetype);
    
    console.log('File validation result:', {
      filename: file.originalname,
      mimetype: file.mimetype,
      hasValidExtension,
      hasValidMimeType,
      willAccept: hasValidExtension && hasValidMimeType
    });
    
    if (hasValidExtension && hasValidMimeType) {
      console.log('File accepted by multer');
      return cb(null, true);
    } else {
      console.log('File rejected by multer');
      cb(new Error('Only PDF, DOC, DOCX, TXT, JPG, JPEG, PNG, and GIF files are allowed'), false);
    }
  },
  onError: (err, next) => {
    console.error('Multer error:', err);
    next(err);
  }
});

module.exports = {
  cloudinary,
  printOrderUpload
};
