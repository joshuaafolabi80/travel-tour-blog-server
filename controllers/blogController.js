// travel-tour-blog-server/controllers/blogController.js - ENHANCED
const Blog = require('../models/Blog');
const mongoose = require('mongoose');

// Set query timeout to 10 seconds instead of default
mongoose.set('maxTimeMS', 10000);

// --- HELPER FUNCTION: Get Query Parameters ---
const getQueryParams = (req) => {
    const { search, category, page = 1, limit = 10, isPublished } = req.query;
    const query = {};
    
    // Add isPublished filter if provided
    if (isPublished !== undefined) {
        query.isPublished = isPublished === 'true'; 
    }
    
    // Add search filter (search title OR content OR summary)
    if (search && search.trim() !== '') {
        const searchRegex = new RegExp(search.trim(), 'i'); // Case-insensitive search
        query.$or = [
            { title: searchRegex },
            { content: searchRegex },
            { summary: searchRegex }
        ];
    }
    
    // Add category filter
    if (category && category !== 'All') {
        query.category = category;
    }

    const pageSize = Math.min(parseInt(limit), 50); // Max 50 per page
    const currentPage = Math.max(1, parseInt(page));
    const skip = (currentPage - 1) * pageSize;

    return { query, page: currentPage, pageSize, skip };
};

// --- HELPER: Format response with pagination ---
const formatPaginationResponse = (posts, total, page, pageSize) => {
    const totalPages = Math.ceil(total / pageSize);
    
    return {
        success: true,
        posts,
        totalPosts: total,
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
    };
};

// =================================================================
// 1. ADMIN Controllers
// =================================================================

// GET all posts (published and drafts) for admin dashboard
exports.getAllAdminPosts = async (req, res) => {
    try {
        console.log('📊 Fetching admin posts...');
        
        // Use lean() for faster queries and select only needed fields
        const posts = await Blog.find({})
            .select('title category summary imageUrl isPublished updatedAt createdAt')
            .sort({ updatedAt: -1 })
            .lean()
            .maxTimeMS(10000); // Set timeout for this query
            
        console.log(`✅ Found ${posts.length} posts`);
        
        // Transform data for frontend
        const transformedPosts = posts.map(post => ({
            _id: post._id,
            title: post.title,
            category: post.category,
            summary: post.summary || '',
            imageUrl: post.imageUrl || '',
            isPublished: post.isPublished,
            updatedAt: post.updatedAt,
            createdAt: post.createdAt
        }));
        
        res.json({ 
            success: true, 
            posts: transformedPosts,
            count: transformedPosts.length
        });
        
    } catch (error) {
        console.error('❌ Error fetching admin posts:', error.message);
        
        if (error.name === 'MongoTimeoutError') {
            return res.status(504).json({ 
                success: false, 
                message: 'Database query timeout. Please try again with fewer filters.' 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Failed to retrieve admin blog posts.', 
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// GET a single post by ID (for editing)
exports.getAdminPostById = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid post ID format.' 
            });
        }
        
        const post = await Blog.findById(id).maxTimeMS(10000);
        
        if (!post) {
            return res.status(404).json({ 
                success: false, 
                message: 'Post not found.' 
            });
        }
        
        res.json({ 
            success: true, 
            post: {
                _id: post._id,
                title: post.title,
                category: post.category,
                summary: post.summary || '',
                content: post.content,
                imageUrl: post.imageUrl || '',
                isPublished: post.isPublished,
                updatedAt: post.updatedAt
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching post by ID:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to retrieve post.', 
            error: error.message 
        });
    }
};

// POST - Create a new post
exports.createPost = async (req, res) => {
    try {
        const { title, category, summary, content, isPublished } = req.body;
        
        // Validate required fields
        if (!title || !title.trim()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Title is required.' 
            });
        }
        
        if (!category) {
            return res.status(400).json({ 
                success: false, 
                message: 'Category is required.' 
            });
        }
        
        if (!content || !content.trim()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Content is required.' 
            });
        }
        
        // Multer/Cloudinary places the uploaded file details on req.file
        const imageUrl = req.file ? req.file.path : null; 

        const newPost = new Blog({
            title: title.trim(),
            category, 
            summary: summary ? summary.trim() : '', 
            content: content.trim(), 
            imageUrl, 
            isPublished: isPublished === 'true' || isPublished === true
        });
        
        await newPost.save();
        
        console.log(`✅ Post created: ${newPost.title}`);
        
        res.status(201).json({ 
            success: true, 
            message: 'Post created successfully!', 
            post: newPost 
        });
        
    } catch (error) {
        console.error('❌ Error creating post:', error.message);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                success: false, 
                message: 'Validation error',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Server error during post creation.', 
            error: error.message 
        });
    }
};

// PUT - Update an existing post
exports.updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, category, summary, content, isPublished, currentImageUrl } = req.body;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid post ID format.' 
            });
        }
        
        // Validate required fields
        if (!title || !title.trim()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Title is required.' 
            });
        }
        
        if (!category) {
            return res.status(400).json({ 
                success: false, 
                message: 'Category is required.' 
            });
        }
        
        if (!content || !content.trim()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Content is required.' 
            });
        }

        // 1. Determine the final image URL:
        let newImageUrl = currentImageUrl; // Default: keep existing URL

        if (req.file) {
            // A NEW file was uploaded: update the URL to the Cloudinary path
            newImageUrl = req.file.path; 
        }

        const updateData = {
            title: title.trim(),
            category, 
            summary: summary ? summary.trim() : '', 
            content: content.trim(), 
            imageUrl: newImageUrl,
            isPublished: isPublished === 'true' || isPublished === true,
            updatedAt: Date.now()
        };

        const updatedPost = await Blog.findByIdAndUpdate(
            id, 
            updateData, 
            { 
                new: true, 
                runValidators: true,
                maxTimeMS: 10000 
            }
        );
        
        if (!updatedPost) {
            return res.status(404).json({ 
                success: false, 
                message: 'Post not found for update.' 
            });
        }
        
        console.log(`✅ Post updated: ${updatedPost.title}`);
        
        res.json({ 
            success: true, 
            message: 'Post updated successfully!', 
            post: updatedPost 
        });

    } catch (error) {
        console.error('❌ Error updating post:', error.message);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                success: false, 
                message: 'Validation error',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Server error during post update.', 
            error: error.message 
        });
    }
};

// DELETE - Delete a post
exports.deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid post ID format.' 
            });
        }
        
        const post = await Blog.findByIdAndDelete(id);
        
        if (!post) {
            return res.status(404).json({ 
                success: false, 
                message: 'Post not found for deletion.' 
            });
        }
        
        console.log(`🗑️ Post deleted: ${post.title}`);
        
        res.json({ 
            success: true, 
            message: 'Post deleted successfully.',
            deletedPost: {
                id: post._id,
                title: post.title
            }
        });
        
    } catch (error) {
        console.error('❌ Error deleting post:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during post deletion.', 
            error: error.message 
        });
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

        console.log(`📰 Fetching published posts - Page: ${page}, Category: ${query.category || 'All'}`);

        const totalPosts = await Blog.countDocuments(query).maxTimeMS(10000);
        
        // Select only fields needed for listing
        const posts = await Blog.find(query)
            .select('title category summary imageUrl updatedAt')
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(pageSize)
            .lean()
            .maxTimeMS(10000);

        console.log(`✅ Found ${posts.length} published posts (Total: ${totalPosts})`);

        res.json(formatPaginationResponse(posts, totalPosts, page, pageSize));
        
    } catch (error) {
        console.error('❌ Error fetching published posts:', error.message);
        
        if (error.name === 'MongoTimeoutError') {
            return res.status(504).json({ 
                success: false, 
                message: 'Database query timeout. Please try again with fewer filters.' 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Failed to retrieve published blog posts.', 
            error: error.message 
        });
    }
};

// GET a single published post by ID
exports.getPublishedPostById = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid post ID format.' 
            });
        }
        
        const post = await Blog.findOne({ 
            _id: id, 
            isPublished: true 
        }).maxTimeMS(10000);
        
        if (!post) {
            return res.status(404).json({ 
                success: false, 
                message: 'Post not found or not published.' 
            });
        }
        
        // Format content for display (if needed)
        const formattedPost = {
            _id: post._id,
            title: post.title,
            category: post.category,
            summary: post.summary || '',
            content: post.content,
            imageUrl: post.imageUrl || '',
            updatedAt: post.updatedAt,
            createdAt: post.createdAt
        };
        
        res.json({ 
            success: true, 
            post: formattedPost 
        });
        
    } catch (error) {
        console.error('❌ Error fetching published post:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to retrieve public blog post.', 
            error: error.message 
        });
    }
};

// GET unique categories for filtering
exports.getCategories = async (req, res) => {
    try {
        const categories = await Blog.distinct('category', { 
            isPublished: true 
        }).maxTimeMS(10000);
        
        // Sort categories alphabetically
        const sortedCategories = categories.sort();
        
        res.json({ 
            success: true, 
            categories: sortedCategories 
        });
        
    } catch (error) {
        console.error('❌ Error fetching categories:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to retrieve categories.', 
            error: error.message 
        });
    }
};