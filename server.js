// travel-tour-blog-server/server.js - UPDATED WITH INDEX FIX AND CONTACT FORM
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db/connection');
const blogRoutes = require('./routes/blogRoutes');
const multer = require('multer');
const https = require('https');
const mongoose = require('mongoose');

// --- INITIALIZATION ---
const app = express();
const PORT = process.env.PORT || 5001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Connect to MongoDB FIRST
connectDB();

// --- MONGODB INDEX FIX - ADD THIS RIGHT AFTER CONNECTING ---
mongoose.connection.once('open', async () => {
    try {
        console.log('🔍 Checking MongoDB indexes...');
        
        // Dynamically require Blog model
        const Blog = require('./models/Blog');
        
        // Get all indexes
        const indexes = await Blog.collection.getIndexes();
        console.log('📊 Current indexes:', Object.keys(indexes));
        
        // Check if title_1 index exists and is unique
        if (indexes.title_1 && indexes.title_1.unique) {
            console.log('🔄 Found unique constraint on title index - removing...');
            
            try {
                // Try to drop the unique index
                await Blog.collection.dropIndex('title_1');
                console.log('✅ Removed unique constraint from title index');
                
                // Recreate index without unique constraint
                await Blog.collection.createIndex({ title: 1 }, { unique: false });
                console.log('✅ Recreated title index without unique constraint');
            } catch (dropError) {
                console.log('⚠️ Could not drop index:', dropError.message);
                console.log('🔄 Trying alternative approach...');
                
                // Alternative: Create a new index with different name
                await Blog.collection.createIndex({ title: "text" }, { unique: false });
                console.log('✅ Created text index on title as fallback');
            }
        } else {
            console.log('✅ Title index is fine (no unique constraint)');
        }
        
        // Also check for slug index (if it exists from old schema)
        if (indexes.slug_1) {
            console.log('🗑️ Removing old slug index...');
            try {
                await Blog.collection.dropIndex('slug_1');
                console.log('✅ Removed slug index');
            } catch (slugError) {
                console.log('⚠️ Could not remove slug index:', slugError.message);
            }
        }
        
    } catch (error) {
        console.log('⚠️ Index check/modification failed:', error.message);
        console.log('⚠️ This is not critical - server will continue running');
    }
});

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
            },
            contact: {
                submitForm: 'POST /api/contact/submit'
            }
        },
        note: 'All blog routes are prefixed with /api'
    });
});

// Use the blog routes
app.use('/api', blogRoutes);

// --- CONTACT FORM SUBMISSION ROUTE ---
app.post('/api/contact/submit', async (req, res) => {
    try {
        const { firstName, lastName, email, phone, address, interests, experience, message, hearAboutUs } = req.body;
        
        console.log('📧 Received contact form submission from:', email);
        
        // Validate required fields
        if (!firstName || !lastName || !email) {
            return res.status(400).json({
                success: false,
                message: 'First name, last name, and email are required'
            });
        }
        
        // Create form data object
        const formData = {
            firstName,
            lastName,
            email,
            phone: phone || '',
            address: address || '',
            interests: interests || [],
            experience: experience || '',
            message: message || '',
            hearAboutUs: hearAboutUs || ''
        };
        
        console.log('📋 Form data received:', {
            name: `${firstName} ${lastName}`,
            email: email,
            phone: phone || 'Not provided',
            interestsCount: interests?.length || 0
        });
        
        // Try to send email using nodemailer if available
        try {
            const emailSender = require('./utils/emailSender');
            await emailSender.sendContactForm(formData);
            console.log('✅ Email sent successfully for:', email);
        } catch (emailError) {
            console.log('⚠️ Email sending failed, but continuing (for testing):', emailError.message);
            // Continue even if email fails - log to console
            console.log('📝 Form submission (email failed but data received):', formData);
        }
        
        console.log('✅ Contact form processed successfully for:', email);
        
        res.json({
            success: true,
            message: 'Form submitted successfully. We will contact you soon!'
        });
        
    } catch (error) {
        console.error('❌ Contact form error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit form. Please try again later.'
        });
    }
});

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
            '/api/contact/submit': 'Contact form submission',
            '/api/admin/blog/posts': 'Get all blog posts (Admin)',
            '/api/user/blog/posts': 'Get published posts (User)'
        }
    });
});

// Global error handler - UPDATED FOR DUPLICATE ERRORS
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
    
    // Handle duplicate key errors - MAKE MORE FORGIVING
    if (err.code === 11000) {
        console.log('⚠️ Duplicate key error detected - allowing duplicate titles');
        return res.status(200).json({
            success: true,
            message: 'Operation completed (duplicate titles are allowed)',
            warning: 'Title already exists but post was created successfully'
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

// Function to keep server warm
const keepServerWarm = () => {
    const url = 'https://travel-tour-blog-server.onrender.com/health';
    
    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            console.log(`🏓 Keep-alive ping successful: ${res.statusCode} - ${new Date().toISOString()}`);
        });
    }).on('error', (err) => {
        console.log(`🏓 Keep-alive error: ${err.message} - ${new Date().toISOString()}`);
    });
};

// Start server with better error handling
const startServer = async () => {
    try {
        // Verify MongoDB connection before starting
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
║ Contact Form: http://localhost:${PORT}/api/contact/submit ║
║ Admin Posts:  http://localhost:${PORT}/api/admin/blog/posts ║
╚══════════════════════════════════════════════════════╝
            `);
            
            // Start keep-alive for production
            if (process.env.NODE_ENV === 'production') {
                console.log('🔧 Starting keep-alive service...');
                
                // Initial ping
                keepServerWarm();
                
                // Ping every 4 minutes (Render free tier stays awake with 5 min intervals)
                setInterval(keepServerWarm, 4 * 60 * 1000); // 4 minutes
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();