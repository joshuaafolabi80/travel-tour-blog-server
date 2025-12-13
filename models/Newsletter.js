const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Name is required'],
        trim: true 
    },
    email: { 
        type: String, 
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        unique: true
    },
    subscribedAt: { 
        type: Date, 
        default: Date.now 
    },
    source: { 
        type: String, 
        default: 'blog',
        enum: ['blog', 'website', 'manual']
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    lastNotified: { 
        type: Date 
    },
    subscriptionCount: { 
        type: Number, 
        default: 1 
    }
}, {
    timestamps: true
});

// Indexes for faster queries
newsletterSchema.index({ email: 1 }, { unique: true });
newsletterSchema.index({ subscribedAt: -1 });
newsletterSchema.index({ isActive: 1 });

module.exports = mongoose.model('Newsletter', newsletterSchema);