// travel-tour-blog-server/models/Blog.js

const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
    },
    content: {
        type: String, // Storing HTML/Rich Text content
        required: true,
    },
    category: {
        type: String,
        required: true,
        enum: ['Travel', 'Tours', 'Hotels', 'Tourism', 'General'],
    },
    author: {
        type: String,
        default: 'Admin', // Storing the author name/alias
    },
    featuredImage: {
        type: String, // Storing the Cloudinary URL or base64 data
        default: '',
    },
    publishedDate: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

const Blog = mongoose.model('Blog', BlogSchema);
module.exports = Blog;