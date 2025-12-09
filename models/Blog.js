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
    // Remove "index: true" from here to avoid duplicate
    slug: {
        type: String,
        unique: true, // This already creates an index
        lowercase: true,
        trim: true
    },
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

// Only keep these indexes (remove the slug index line)
BlogSchema.index({ isPublished: 1, createdAt: -1 });
BlogSchema.index({ category: 1 });
// REMOVE THIS LINE: BlogSchema.index({ slug: 1 });

module.exports = mongoose.model('Blog', BlogSchema);