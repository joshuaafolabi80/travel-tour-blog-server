// travel-tour-blog-server/server.js - UPDATED
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db/connection');
const blogRoutes = require('./routes/blogRoutes');
const multer = require('multer');

// --- INITIALIZATION ---
const app = express();
const PORT = process.env.PORT || 5001; // Changed to 5001 to avoid conflicts
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Connect to MongoDB FIRST
connectDB();

// Middleware - CORS with better configuration
app.use(cors({
    origin: CLIENT_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    maxAge: 86400 // 24 hours
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Health check with MongoDB connection status
app.get('/health', async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const mongoStatus = mongoose.connection.readyState;
        const statusText = {
            0: 'Disconnected',
            1: 'Connected',
            2: 'Connecting',
            3: 'Disconnecting'
        };

        res.json({
            status: 'OK',
            service: 'Travel Tour Blog Server',
            time: new Date().toISOString(),
            mongodb: {
                status: statusText[mongoStatus] || 'Unknown',
                readyState: mongoStatus
            },
            environment: {
                hasMongoDB: !!process.env.MONGO_URI,
                hasCloudinary: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),
                clientUrl: CLIENT_URL,
                port: PORT,
                nodeEnv: process.env.NODE_ENV || 'development'
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            message: error.message
        });
    }
});

// Welcome endpoint
app.get('/', (req, res) => {
    res.json({
        message: '🚀 Welcome to Travel Tour Blog API',
        version: '2.0.0',
        endpoints: {
            health: '/health',
            admin: {
                getAllPosts: 'GET /api/admin/blog/posts',
                getSinglePost: 'GET /api/admin/blog/posts/:id',
                createPost: 'POST /api/admin/blog/posts',
                updatePost: 'PUT /api/admin/blog/posts/:id',
                deletePost: 'DELETE /api/admin/blog/posts/:id'
            },
            user: {
                getPublishedPosts: 'GET /api/user/blog/posts',
                getSinglePost: 'GET /api/user/blog/posts/:id',
                getCategories: 'GET /api/user/blog/categories'
            }
        },
        note: 'All blog routes are prefixed with /api'
    });
});

// Use the blog routes
app.use('/api', blogRoutes);

// Test endpoint for quick verification
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working!',
        timestamp: new Date().toISOString()
    });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: `The requested endpoint ${req.originalUrl} does not exist`,
        availableEndpoints: {
            '/': 'API documentation',
            '/health': 'Health check with MongoDB status',
            '/api/test': 'Quick API test',
            '/api/admin/blog/posts': 'Get all blog posts (Admin)',
            '/api/user/blog/posts': 'Get published posts (User)'
        }
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('🔥 Global error handler:', err.stack || err.message);
    
    // Handle multer errors (file upload)
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            error: 'File upload error',
            message: err.message,
            code: err.code
        });
    }
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Validation error',
            message: err.message,
            details: Object.values(err.errors).map(e => e.message)
        });
    }
    
    // Handle duplicate key errors
    if (err.code === 11000) {
        return res.status(409).json({
            success: false,
            error: 'Duplicate entry',
            message: 'A blog post with similar data already exists'
        });
    }
    
    // Handle timeout errors
    if (err.name === 'MongoTimeoutError' || err.message.includes('timeout')) {
        return res.status(504).json({
            success: false,
            error: 'Database timeout',
            message: 'Database operation timed out. Please try again.'
        });
    }
    
    // Handle MongoDB connection errors
    if (err.name === 'MongoNetworkError') {
        return res.status(503).json({
            success: false,
            error: 'Database connection error',
            message: 'Cannot connect to database. Please check MongoDB connection.'
        });
    }
    
    // Default error
    res.status(err.status || 500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong. Please try again later.',
        timestamp: new Date().toISOString()
    });
});

// Start server with better error handling
const startServer = async () => {
    try {
        // Verify MongoDB connection before starting
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
            console.log('⏳ Waiting for MongoDB connection...');
            await new Promise(resolve => {
                mongoose.connection.once('connected', resolve);
                setTimeout(() => {
                    console.log('⚠️ MongoDB connection timeout. Starting server anyway...');
                    resolve();
                }, 10000);
            });
        }
        
        app.listen(PORT, () => {
            console.log(`
╔══════════════════════════════════════════════════════╗
║        🚀 TRAVEL TOUR BLOG SERVER STARTED           ║
╠══════════════════════════════════════════════════════╣
║ Port:         ${PORT}                                ║
║ Environment:  ${process.env.NODE_ENV || 'development'}║
║ MongoDB:      ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'} ║
║ Client URL:   ${CLIENT_URL}                          ║
╠══════════════════════════════════════════════════════╣
║ Health Check: http://localhost:${PORT}/health        ║
║ API Test:     http://localhost:${PORT}/api/test      ║
║ Admin Posts:  http://localhost:${PORT}/api/admin/blog/posts ║
╚══════════════════════════════════════════════════════╝
            `);
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();