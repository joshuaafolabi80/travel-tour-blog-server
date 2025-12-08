// travel-tour-blog-server/config/cloudinary.js

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// --- 1. Cloudinary Configuration ---
// Requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in your .env file
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- 2. Storage Engine Configuration ---
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'blog-featured-images', // Cloudinary folder to store blog images
        allowed_formats: ['jpg', 'png', 'jpeg'],
        // Optional: Resize and optimize the image upon upload
        transformation: [{ width: 800, height: 600, crop: 'limit' }] 
    }
});

// --- 3. Multer Middleware ---
// This is the middleware function we will use in the routes
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

module.exports = { cloudinary, upload };