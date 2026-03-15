const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim().replace(/['"]/g, ''),
  api_key: process.env.CLOUDINARY_API_KEY?.trim().replace(/['"]/g, ''),
  api_secret: process.env.CLOUDINARY_API_SECRET?.trim().replace(/['"]/g, ''),
});

// Configure Cloudinary Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'tvs-wms',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

// File filter — only allow jpg and png
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only .jpg and .png image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

module.exports = upload;
