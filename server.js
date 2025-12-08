// travel-tour-blog-server/server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose'); // Import mongoose
const connectDB = require('./db/connection'); // Import connection
const Blog = require('./models/Blog'); // Import model
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// --- INITIALIZATION ---
const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Setup Multer storage with Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'blog_images', // Cloudinary folder
        format: async (req, file) => 'jpeg', 
        public_id: (req, file) => `blog-img-${Date.now()}`,
    },
});

const upload = multer({ storage: storage });

// Connect to MongoDB
connectDB(); 

// Middleware
app.use(cors({
    origin: CLIENT_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// --- UTILITY ---
const createSlug = (text) => {
    return text.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
};

// --- ROUTES ---

// 1. ADMIN CREATE/EDIT POST (CRUD - Create/Update)
app.post('/api/admin/create-post', upload.single('featuredImage'), async (req, res) => {
    const { title, content, category, author } = req.body;
    const slug = createSlug(title);
    const imageUrl = req.file ? req.file.path : ''; // Cloudinary path is available here

    if (!title || !content || !category) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    try {
        const newPost = new Blog({
            title,
            slug,
            content,
            category,
            author: author || 'Admin',
            featuredImage: imageUrl,
            publishedDate: new Date(),
        });

        await newPost.save();
        res.status(201).json({ message: 'Blog post created and published successfully!', postId: newPost._id });

    } catch (error) {
        console.error('Error creating post:', error.message);
        if (error.code === 11000) { // Duplicate key error (e.g., duplicate title/slug)
            return res.status(409).json({ message: 'Post with this title already exists.' });
        }
        res.status(500).json({ message: 'Failed to create blog post via MongoDB.', details: error.message });
    }
});

app.put('/api/admin/edit-post/:id', upload.single('featuredImage'), async (req, res) => {
    const { id } = req.params;
    const { title, content, category, author, existingImage } = req.body;
    const slug = createSlug(title);
    
    // Determine the image URL
    let imageUrl = existingImage || ''; 
    if (req.file) {
        imageUrl = req.file.path;
        // Optionally, delete the old image from Cloudinary here if needed
    }

    if (!title || !content || !category) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    try {
        const updatedPost = await Blog.findByIdAndUpdate(
            id,
            {
                title,
                slug,
                content,
                category,
                author,
                featuredImage: imageUrl,
                // Do not update publishedDate on edit unless explicitly requested
            },
            { new: true } // Return the updated document
        );

        if (!updatedPost) {
            return res.status(404).json({ message: 'Blog post not found.' });
        }

        res.status(200).json({ message: 'Blog post updated successfully!', postId: updatedPost._id });

    } catch (error) {
        console.error('Error updating post:', error.message);
        res.status(500).json({ message: 'Failed to update blog post.', details: error.message });
    }
});


// 2. ADMIN/USER READ ALL POSTS (CRUD - Read) - Admin dashboard/User List
app.get('/api/blog-posts', async (req, res) => {
    const { category, search, page = 1, limit = 5 } = req.query;
    const query = {};

    if (category && category !== 'All') {
        query.category = category;
    }
    if (search) {
        // Simple text search across title, content, and category
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { content: { $regex: search, $options: 'i' } },
            { category: { $regex: search, $options: 'i' } },
        ];
    }
    
    try {
        const totalPosts = await Blog.countDocuments(query);
        const posts = await Blog.find(query)
            .sort({ publishedDate: -1 }) // Sort by newest first
            .limit(limit * 1)
            .skip((page - 1) * limit);

        res.json({
            posts,
            totalPages: Math.ceil(totalPosts / limit),
            currentPage: Number(page),
            totalPosts,
        });
    } catch (error) {
        console.error('Error fetching blog posts:', error.message);
        // Always return a clean structure on error to prevent frontend crash
        res.status(500).json({ posts: [], totalPages: 0, currentPage: 1, totalPosts: 0, message: error.message });
    }
});


// 3. ADMIN/USER READ SINGLE POST (CRUD - Read)
app.get('/api/blog-posts/:id', async (req, res) => {
    try {
        const post = await Blog.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Blog post not found.' });
        }
        res.json(post);
    } catch (error) {
        console.error('Error fetching single post:', error.message);
        res.status(500).json({ message: 'Failed to fetch post.' });
    }
});

// 4. ADMIN DELETE POST (CRUD - Delete)
app.delete('/api/admin/delete-post/:id', async (req, res) => {
    try {
        const deletedPost = await Blog.findByIdAndDelete(req.params.id);
        if (!deletedPost) {
            return res.status(404).json({ message: 'Blog post not found.' });
        }
        // Optional: Implement Cloudinary deletion logic here if needed
        res.status(200).json({ message: 'Blog post deleted successfully!' });
    } catch (error) {
        console.error('Error deleting post:', error.message);
        res.status(500).json({ message: 'Failed to delete post.' });
    }
});


// Start the Express server
app.listen(PORT, () => {
    console.log(`🚀 Express server running on port ${PORT}`);
    console.log(`CORS configured for origin: ${CLIENT_URL || 'Not specified in .env'}`);
});