// travel-tour-blog-server/models/Blog.js

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
    },
    // Add slug for SEO-friendly URLs
    slug: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true
    },
    // Add tags for better organization
    tags: [{
        type: String,
        trim: true
    }],
    // Add view count
    views: {
        type: Number,
        default: 0
    },
    // Add author reference if you have user system
    author: {
        type: String,
        default: 'Admin'
    }
}, {
    timestamps: true // Adds createdAt and updatedAt fields
});

// Create slug from title before saving
BlogSchema.pre('save', function(next) {
    if (this.isModified('title') || !this.slug) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^\w\s]/gi, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }
    next();
});

// Index for better performance
BlogSchema.index({ isPublished: 1, createdAt: -1 });
BlogSchema.index({ category: 1 });
BlogSchema.index({ slug: 1 });

module.exports = mongoose.model('Blog', BlogSchema);