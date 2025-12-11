// travel-tour-blog-server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db/connection');
const blogRoutes = require('./routes/blogRoutes');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

// --- INITIALIZATION ---
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Connect to MongoDB FIRST
connectDB();

// --- SOCKET.IO SETUP ---
const io = new Server(server, {
    cors: {
        origin: CLIENT_URL,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Store io instance globally
app.set('socketio', io);

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id);
    
    socket.on('admin-connected', () => {
        console.log('👑 Admin connected to socket');
        socket.join('admin-room');
    });
    
    socket.on('user-connected', (userEmail) => {
        console.log('👤 User connected to socket:', userEmail);
        socket.join(`user-${userEmail}`);
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected:', socket.id);
    });
});

// Middleware - CORS
app.use(cors({
    origin: CLIENT_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    maxAge: 86400
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Test endpoint - ADD THIS FOR DEBUGGING
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        service: 'Travel Tour Blog API',
        version: '2.0.0',
        time: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Health check
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
        message: '🚀 Travel Tour Blog API',
        version: '2.0.0',
        features: ['Blog Management', 'Submissions Dashboard', 'Real-time Notifications']
    });
});

// Use the blog routes
app.use('/api', blogRoutes);

// --- SUBMISSION ROUTES ---
const Submission = require('./models/Submission');

// Debug: Check if Submission model loads
console.log('🔍 Submission model loaded:', Submission ? 'YES' : 'NO');

// 1. Save submission (REPLACES EMAIL)
app.post('/api/contact/submit', async (req, res) => {
    try {
        const formData = req.body;
        
        console.log('📝 New submission from:', formData.email);
        
        // Save to database
        const submission = new Submission({
            ...formData,
            status: 'new',
            notificationCount: {
                admin: 1, // New notification for admin
                user: 0
            }
        });
        
        await submission.save();
        
        // Notify admin via socket
        const io = req.app.get('socketio');
        io.to('admin-room').emit('new-submission', {
            submission: submission.toObject(),
            notification: true
        });
        
        console.log('✅ Submission saved:', submission._id);
        
        res.json({
            success: true,
            message: 'Submission received! Check your dashboard for updates.',
            submissionId: submission._id,
            dashboardUrl: '/user-submissions'
        });
        
    } catch (error) {
        console.error('❌ Submission error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to save submission' 
        });
    }
});

// 2. Get all submissions for admin
app.get('/api/submissions/admin', async (req, res) => {
    try {
        const submissions = await Submission.find()
            .sort({ createdAt: -1 })
            .limit(100);
        
        // Calculate unread count
        const unreadCount = submissions.filter(s => !s.isReadByAdmin && s.status === 'new').length;
        
        res.json({ 
            success: true, 
            submissions,
            unreadCount 
        });
    } catch (error) {
        console.error('❌ Error fetching admin submissions:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch submissions' });
    }
});

// 3. Get submissions for specific user by email
app.get('/api/submissions/user/:email', async (req, res) => {
    try {
        const submissions = await Submission.find({ 
            email: req.params.email.toLowerCase() 
        })
        .sort({ createdAt: -1 })
        .limit(50);
        
        // Calculate unread count for user
        const unreadCount = submissions.filter(s => 
            !s.isReadByUser && s.status === 'replied'
        ).length;
        
        res.json({ 
            success: true, 
            submissions,
            unreadCount 
        });
    } catch (error) {
        console.error('❌ Error fetching user submissions:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch submissions' });
    }
});

// 4. Admin reply to submission - FIXED AND SIMPLIFIED
app.post('/api/submissions/:id/reply', async (req, res) => {
    console.log('🔵 REPLY ENDPOINT CALLED!');
    console.log('🔵 Submission ID:', req.params.id);
    console.log('🔵 Request body:', JSON.stringify(req.body));
    
    try {
        const { adminReply, adminId } = req.body;
        const submissionId = req.params.id;
        
        if (!adminReply || adminReply.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Reply message is required'
            });
        }
        
        console.log('💬 Admin replying to submission:', submissionId);
        
        const submission = await Submission.findById(submissionId);
        
        if (!submission) {
            console.log('❌ Submission not found:', submissionId);
            return res.status(404).json({
                success: false,
                message: 'Submission not found'
            });
        }
        
        console.log('✅ Found submission for:', submission.email);
        
        // Update submission
        submission.adminReply = {
            message: adminReply.trim(),
            repliedAt: new Date(),
            adminId: adminId || 'admin'
        };
        submission.status = 'replied';
        submission.isReadByUser = false;
        
        // Initialize notificationCount if not exists
        if (!submission.notificationCount) {
            submission.notificationCount = { admin: 0, user: 0 };
        }
        submission.notificationCount.user += 1;
        
        await submission.save();
        console.log('✅ Submission updated successfully');
        
        // Get socket.io instance
        const io = req.app.get('socketio');
        if (io) {
            const userRoom = `user-${submission.email}`;
            console.log('🔔 Sending socket notification to room:', userRoom);
            
            io.to(userRoom).emit('admin-reply', {
                submissionId: submission._id,
                message: adminReply,
                repliedAt: new Date(),
                email: submission.email
            });
        }
        
        res.json({
            success: true,
            message: 'Reply sent successfully',
            submission: {
                _id: submission._id,
                email: submission.email,
                adminReply: submission.adminReply,
                status: submission.status
            }
        });
        
    } catch (error) {
        console.error('❌ ERROR in reply endpoint:');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // Check for specific error types
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid submission ID format'
            });
        }
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error: ' + error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 5. Mark submission as read by admin
app.put('/api/submissions/:id/read-admin', async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.id);
        if (!submission) {
            return res.status(404).json({ 
                success: false, 
                message: 'Submission not found' 
            });
        }
        
        submission.isReadByAdmin = true;
        submission.status = submission.status === 'new' ? 'viewed' : submission.status;
        
        await submission.save();
        
        res.json({ 
            success: true, 
            message: 'Marked as read by admin',
            submission 
        });
        
    } catch (error) {
        console.error('❌ Mark read error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to mark as read' 
        });
    }
});

// 6. Mark submission as read by user
app.put('/api/submissions/:id/read-user', async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.id);
        if (!submission) {
            return res.status(404).json({ 
                success: false, 
                message: 'Submission not found' 
            });
        }
        
        submission.isReadByUser = true;
        submission.notificationCount.user = 0;
        
        await submission.save();
        
        res.json({ 
            success: true, 
            message: 'Marked as read by user',
            submission 
        });
        
    } catch (error) {
        console.error('❌ Mark read error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to mark as read' 
        });
    }
});

// 7. Get unread count for admin
app.get('/api/submissions/admin/unread-count', async (req, res) => {
    try {
        const count = await Submission.countDocuments({ 
            isReadByAdmin: false,
            status: 'new'
        });
        
        res.json({ 
            success: true, 
            count 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get count' 
        });
    }
});

// 8. Get unread count for user
app.get('/api/submissions/user/:email/unread-count', async (req, res) => {
    try {
        const count = await Submission.countDocuments({ 
            email: req.params.email.toLowerCase(),
            isReadByUser: false,
            status: 'replied'
        });
        
        res.json({ 
            success: true, 
            count 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get count' 
        });
    }
});

// 9. Delete submission
app.delete('/api/submissions/:id', async (req, res) => {
    try {
        const submissionId = req.params.id;
        
        const submission = await Submission.findById(submissionId);
        if (!submission) {
            return res.status(404).json({ 
                success: false, 
                message: 'Submission not found' 
            });
        }
        
        await Submission.findByIdAndDelete(submissionId);
        
        console.log('🗑️ Submission deleted:', submissionId);
        
        res.json({ 
            success: true, 
            message: 'Submission deleted successfully'
        });
        
    } catch (error) {
        console.error('❌ Delete error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete submission' 
        });
    }
});

// Test endpoint for debugging submissions
app.get('/api/debug-submission/:id', async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.id);
        if (!submission) {
            return res.status(404).json({ 
                success: false, 
                message: 'Submission not found' 
            });
        }
        
        res.json({ 
            success: true, 
            submission: {
                _id: submission._id,
                email: submission.email,
                firstName: submission.firstName,
                lastName: submission.lastName,
                status: submission.status,
                adminReply: submission.adminReply,
                isReadByUser: submission.isReadByUser,
                notificationCount: submission.notificationCount
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// Simple test endpoint for reply
app.post('/api/test-reply', (req, res) => {
    console.log('✅ Test reply endpoint hit!');
    console.log('📦 Request body:', req.body);
    res.json({
        success: true,
        message: 'Test endpoint works!',
        received: req.body,
        timestamp: new Date().toISOString()
    });
});

// Test endpoint
app.get('/api/test-submissions', async (req, res) => {
    try {
        const count = await Submission.countDocuments();
        const recent = await Submission.find().sort({ createdAt: -1 }).limit(3);
        
        res.json({
            success: true,
            message: 'Submissions system is working',
            totalSubmissions: count,
            recentSubmissions: recent.map(s => ({
                _id: s._id,
                email: s.email,
                status: s.status
            })),
            endpoints: {
                submit: 'POST /api/contact/submit',
                adminList: 'GET /api/submissions/admin',
                userList: 'GET /api/submissions/user/:email',
                adminReply: 'POST /api/submissions/:id/reply',
                delete: 'DELETE /api/submissions/:id'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 404 handler - MUST BE LAST
app.use('*', (req, res) => {
    console.log('❌ 404 - Endpoint not found:', req.originalUrl);
    res.status(404).json({
        error: 'Endpoint not found',
        message: `The requested endpoint ${req.originalUrl} does not exist`,
        availableEndpoints: [
            '/api/status',
            '/api/contact/submit',
            '/api/submissions/admin',
            '/api/submissions/user/:email',
            '/api/submissions/:id/reply',
            '/api/test-reply',
            '/api/debug-submission/:id'
        ]
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('🔥 Global error:', err.stack || err.message);
    
    res.status(err.status || 500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        timestamp: new Date().toISOString()
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║        🚀 TRAVEL TOUR BLOG SERVER STARTED           ║
║        🕒 ${new Date().toISOString()}                 ║
╠══════════════════════════════════════════════════════╣
║ Port:         ${PORT}                                ║
║ Environment:  ${process.env.NODE_ENV || 'development'}║
║ MongoDB:      ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'} ║
║ Socket.IO:    ✅ Active                              ║
║ Submissions:  ✅ Dashboard System                    ║
╠══════════════════════════════════════════════════════╣
║ Test URLs:                                          ║
║ • Health:     http://localhost:${PORT}/health        ║
║ • Status:     http://localhost:${PORT}/api/status    ║
║ • Test:       http://localhost:${PORT}/api/test-submissions ║
╚══════════════════════════════════════════════════════╝
    `);
});