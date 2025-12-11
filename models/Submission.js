const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    firstName: { 
        type: String, 
        required: [true, 'First name is required'],
        trim: true 
    },
    lastName: { 
        type: String, 
        required: [true, 'Last name is required'],
        trim: true 
    },
    email: { 
        type: String, 
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true
    },
    phone: { 
        type: String,
        trim: true 
    },
    address: { 
        type: String,
        trim: true 
    },
    interests: [{ 
        type: String,
        trim: true 
    }],
    experience: { 
        type: String,
        trim: true 
    },
    message: { 
        type: String,
        trim: true 
    },
    hearAboutUs: { 
        type: String,
        trim: true 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        default: null 
    },
    status: { 
        type: String, 
        enum: ['new', 'viewed', 'replied', 'closed'],
        default: 'new'
    },
    adminReply: {
        message: { type: String },
        repliedAt: { type: Date },
        adminId: { type: mongoose.Schema.Types.ObjectId }
    },
    isReadByAdmin: { 
        type: Boolean, 
        default: false 
    },
    isReadByUser: { 
        type: Boolean, 
        default: false 
    },
    notificationCount: {
        admin: { type: Number, default: 0 },
        user: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

// Indexes for faster queries
submissionSchema.index({ email: 1, createdAt: -1 });
submissionSchema.index({ status: 1 });
submissionSchema.index({ isReadByAdmin: 1 });
submissionSchema.index({ isReadByUser: 1 });
submissionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Submission', submissionSchema);