// travel-tour-blog-server/server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db/connection'); // Import connection

// Import the blog routes
const blogRoutes = require('./routes/blogRoutes');

// --- INITIALIZATION ---
const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
    origin: CLIENT_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Travel Tour Blog Server',
        time: new Date().toISOString(),
        environment: {
            hasMongoDB: !!process.env.MONGODB_URI,
            hasCloudinary: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),
            clientUrl: process.env.CLIENT_URL,
            port: PORT
        }
    });
});

// Welcome endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to Travel Tour Blog API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            blogPosts: '/api/blog-posts',
            createPost: '/api/admin/create-post',
            getSinglePost: '/api/blog-posts/:id',
            editPost: '/api/admin/edit-post/:id',
            deletePost: '/api/admin/delete-post/:id'
        },
        documentation: 'All blog routes are prefixed with /api'
    });
});

// Use the blog routes
app.use('/api', blogRoutes); // This will prefix all routes in blogRoutes.js with /api

// 404 handler for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: `The requested endpoint ${req.originalUrl} does not exist`,
        availableEndpoints: {
            '/': 'API documentation',
            '/health': 'Health check',
            '/api/blog-posts': 'Get all blog posts',
            '/api/blog-posts/:id': 'Get single blog post',
            '/api/admin/create-post': 'Create new blog post',
            '/api/admin/edit-post/:id': 'Edit blog post',
            '/api/admin/delete-post/:id': 'Delete blog post'
        }
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    
    // Handle multer errors (file upload)
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            error: 'File upload error',
            message: err.message
        });
    }
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation error',
            message: err.message,
            details: Object.values(err.errors).map(e => e.message)
        });
    }
    
    // Handle duplicate key errors
    if (err.code === 11000) {
        return res.status(409).json({
            error: 'Duplicate entry',
            message: 'A blog post with this title or slug already exists'
        });
    }
    
    // Default error
    res.status(err.status || 500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Start the Express server
app.listen(PORT, () => {
    console.log(`🚀 Express server running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`📝 Create post: POST http://localhost:${PORT}/api/admin/create-post`);
    console.log(`📰 Get posts: GET http://localhost:${PORT}/api/blog-posts`);
    console.log(`🔐 Admin routes prefixed with /api/admin`);
    console.log(`🌐 CORS configured for origin: ${CLIENT_URL || 'Not specified in .env'}`);
    console.log(`📊 MongoDB connected: ${process.env.MONGODB_URI ? 'Yes' : 'No'}`);
    console.log(`☁️ Cloudinary configured: ${process.env.CLOUDINARY_CLOUD_NAME ? 'Yes' : 'No'}`);
});