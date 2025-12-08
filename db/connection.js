// travel-tour-blog-server/db/connection.js

const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('🔗 MongoDB connected successfully.');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        // Exit process with failure
        process.exit(1); 
    }
};

module.exports = connectDB;