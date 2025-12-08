// travel-tour-blog-server/controllers/blogController.js

const Blog = require('../models/Blog');

// --- HELPER FUNCTION: Get Query Parameters ---
const getQueryParams = (req) => {
    const { search, category, page = 1, limit = 6, isPublished } = req.query;
    const query = {};
    
    // Add isPublished filter if provided
    if (isPublished !== undefined) {
        query.isPublished = isPublished === 'true'; 
    }
    
    // Add search filter (search title OR content)
    if (search) {
        const searchRegex = new RegExp(search, 'i'); // Case-insensitive search
        query.$or = [
            { title: searchRegex },
            { content: searchRegex }
        ];
    }
    
    // Add category filter
    if (category) {
        query.category = category;
    }

    const pageSize = parseInt(limit);
    const skip = (parseInt(page) - 1) * pageSize;

    return { query, page: parseInt(page), pageSize, skip };
};


// =================================================================
// 1. ADMIN Controllers (Private Access - Assume Auth Middleware is present)
// =================================================================

// GET all posts (published and drafts) for admin dashboard
exports.getAllAdminPosts = async (req, res) => {
    try {
        // Admin sees all posts, regardless of published status
        const posts = await Blog.find({}).sort({ updatedAt: -1 });
        res.json({ success: true, posts });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to retrieve admin blog posts.', error: error.message });
    }
};

// GET a single post by ID (for editing)
exports.getAdminPostById = async (req, res) => {
    try {
        const post = await Blog.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }
        res.json({ success: true, post });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to retrieve post for admin.', error: error.message });
    }
};

// POST - Create a new post
exports.createPost = async (req, res) => {
    try {
        const { title, category, summary, content, isPublished } = req.body;
        
        // Multer/Cloudinary places the uploaded file details on req.file
        const imageUrl = req.file ? req.file.path : null; 

        if (!title || !category || !content) {
             // You can add logic here to delete the uploaded image if other fields are missing
             return res.status(400).json({ success: false, message: 'Title, Category, and Content are required.' });
        }
        
        const newPost = new Blog({
            title, 
            category, 
            summary, 
            content, 
            imageUrl, 
            isPublished: isPublished === 'true' // Convert string to boolean
        });
        
        await newPost.save();
        res.status(201).json({ success: true, message: 'Post created successfully!', post: newPost });
        
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error during post creation.', error: error.message });
    }
};

// PUT - Update an existing post
exports.updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, category, summary, content, isPublished, currentImageUrl } = req.body;

        // 1. Determine the final image URL:
        let newImageUrl = currentImageUrl; // Default: keep existing URL

        if (req.file) {
            // A NEW file was uploaded: update the URL to the Cloudinary path
            newImageUrl = req.file.path; 
            // NOTE: For a complete solution, you would add logic here to delete the image 
            // associated with 'currentImageUrl' from Cloudinary to avoid orphaned files.
        }

        const updatedPost = await Blog.findByIdAndUpdate(id, {
            title, 
            category, 
            summary, 
            content, 
            imageUrl: newImageUrl,
            isPublished: isPublished === 'true' 
        }, { new: true, runValidators: true });
        
        if (!updatedPost) {
            return res.status(404).json({ success: false, message: 'Post not found for update.' });
        }
        
        res.json({ success: true, message: 'Post updated successfully!', post: updatedPost });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error during post update.', error: error.message });
    }
};

// DELETE - Delete a post
exports.deletePost = async (req, res) => {
    try {
        const post = await Blog.findByIdAndDelete(req.params.id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found for deletion.' });
        }
        // NOTE: You should also add logic here to delete the image from Cloudinary
        res.json({ success: true, message: 'Post deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error during post deletion.', error: error.message });
    }
};


// =================================================================
// 2. USER Controllers (Public Access)
// =================================================================

// GET all published posts with pagination and filtering
exports.getPublishedPosts = async (req, res) => {
    try {
        const { query, page, pageSize, skip } = getQueryParams(req);
        query.isPublished = true; // Crucial: Only show published posts to users

        const totalPosts = await Blog.countDocuments(query);
        const posts = await Blog.find(query)
            .sort({ updatedAt: -1 }) // Sort by newest first
            .skip(skip)
            .limit(pageSize);

        res.json({
            success: true,
            posts,
            totalPosts,
            currentPage: page,
            totalPages: Math.ceil(totalPosts / pageSize)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to retrieve published blog posts.', error: error.message });
    }
};

// GET a single published post by ID
exports.getPublishedPostById = async (req, res) => {
    try {
        const post = await Blog.findOne({ _id: req.params.id, isPublished: true });
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found or not published.' });
        }
        res.json({ success: true, post });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to retrieve public blog post.', error: error.message });
    }
};

// GET unique categories for filtering
exports.getCategories = async (req, res) => {
    try {
        const categories = await Blog.distinct('category', { isPublished: true });
        res.json({ success: true, categories });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to retrieve categories.', error: error.message });
    }
};