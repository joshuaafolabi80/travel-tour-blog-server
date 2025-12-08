// travel-tour-blog-server/models/Blog.js

const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [100, 'Title cannot be more than 100 characters']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['Travels', 'Tours', 'Hotels', 'Tourism'], // Enforced categories
        default: 'Travels'
    },
    summary: {
        type: String,
        maxlength: [500, 'Summary cannot be more than 500 characters']
    },
    content: {
        type: String,
        required: [true, 'Content is required']
    },
    imageUrl: {
        type: String,
        default: '' // Cloudinary URL or empty string
    },
    isPublished: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true // Adds createdAt and updatedAt fields
});

module.exports = mongoose.model('Blog', BlogSchema);