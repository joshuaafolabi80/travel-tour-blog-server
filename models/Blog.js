// Update Blog.js model to REMOVE slug field:
const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [200, 'Title cannot be more than 200 characters']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['Travels', 'Tours', 'Hotels', 'Tourism'],
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
        default: ''
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    // REMOVE THE ENTIRE slug FIELD
    tags: [{
        type: String,
        trim: true
    }],
    views: {
        type: Number,
        default: 0
    },
    author: {
        type: String,
        default: 'Admin'
    }
}, {
    timestamps: true
});

// REMOVE the pre-save middleware for slug
BlogSchema.index({ isPublished: 1, createdAt: -1 });
BlogSchema.index({ category: 1 });

module.exports = mongoose.model('Blog', BlogSchema);