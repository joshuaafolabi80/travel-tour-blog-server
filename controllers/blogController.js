// travel-tour-blog-server/controllers/blogController.js
const Blog = require('../models/Blog');

// =================================================================
// ADMIN CONTROLLERS
// =================================================================

// Get all posts (for admin - includes drafts and published)
exports.getAllAdminPosts = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', category = '' } = req.query;
        
        // Build query
        let query = {};
        
        // Search functionality
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { summary: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Filter by category
        if (category) {
            query.category = category;
        }
        
        // Get total count
        const total = await Blog.countDocuments(query);
        
        // Get posts with pagination
        const posts = await Blog.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * parseInt(limit))
            .limit(parseInt(limit));
        
        res.json({
            success: true,
            posts,
            count: total,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Error fetching admin posts:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching posts',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get single post by ID (for admin editing)
exports.getAdminPostById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const post = await Blog.findById(id);
        
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }
        
        res.json({
            success: true,
            post
        });
        
    } catch (error) {
        console.error('Error fetching admin post:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching post',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Create a new post - COMPLETELY REMOVED DUPLICATE CHECK
exports.createPost = async (req, res) => {
    try {
        const { title, category, summary, content, isPublished, tags } = req.body;
        
        console.log('📝 Creating new post with title:', title);
        
        // Validate required fields
        if (!title || !content || !category) {
            return res.status(400).json({
                success: false,
                message: 'Title, content, and category are required'
            });
        }
        
        // REMOVED DUPLICATE TITLE CHECK - Allow same titles
        
        // Create the post
        const newPost = new Blog({
            title,
            category,
            summary: summary || content.substring(0, 150) + '...',
            content,
            isPublished: isPublished === 'true' || isPublished === true,
            tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())) : [],
            imageUrl: req.file ? req.file.path : '' // Cloudinary URL if file uploaded
        });
        
        console.log('💾 Saving new post to database...');
        
        // Save to database
        await newPost.save();
        
        console.log('✅ Post created successfully:', newPost._id);
        
        res.status(201).json({
            success: true,
            message: 'Blog post created successfully',
            post: newPost
        });
        
    } catch (error) {
        console.error('❌ Error creating post:', error);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }
        
        // Handle duplicate key error - IGNORE IT AND CONTINUE
        if (error.code === 11000) {
            console.log('⚠️ Duplicate key error detected, but continuing anyway...');
            console.log('⚠️ Error details:', error.message);
            
            // Try to create with a slightly modified title
            try {
                const modifiedTitle = `${req.body.title} (${Date.now()})`;
                console.log(`🔄 Retrying with modified title: ${modifiedTitle}`);
                
                const retryPost = new Blog({
                    title: modifiedTitle,
                    category: req.body.category,
                    summary: req.body.summary || req.body.content.substring(0, 150) + '...',
                    content: req.body.content,
                    isPublished: req.body.isPublished === 'true' || req.body.isPublished === true,
                    tags: req.body.tags ? (Array.isArray(req.body.tags) ? req.body.tags : req.body.tags.split(',').map(tag => tag.trim())) : [],
                    imageUrl: req.file ? req.file.path : ''
                });
                
                await retryPost.save();
                
                return res.status(201).json({
                    success: true,
                    message: 'Blog post created successfully (title was modified to avoid conflict)',
                    post: retryPost,
                    note: 'Title was modified due to existing similar title'
                });
            } catch (retryError) {
                console.error('❌ Retry also failed:', retryError);
            }
        }
        
        res.status(500).json({
            success: false,
            message: 'Error creating post',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Update an existing post
exports.updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };
        
        console.log('📝 Updating post:', id);
        
        // Handle tags if provided
        if (updateData.tags && typeof updateData.tags === 'string') {
            updateData.tags = updateData.tags.split(',').map(tag => tag.trim());
        }
        
        // Handle boolean conversion for isPublished
        if (updateData.isPublished !== undefined) {
            updateData.isPublished = updateData.isPublished === 'true' || updateData.isPublished === true;
        }
        
        // Handle image upload
        if (req.file) {
            updateData.imageUrl = req.file.path;
        }
        
        // Update the post - NO DUPLICATE CHECK
        const updatedPost = await Blog.findByIdAndUpdate(
            id,
            updateData,
            { 
                new: true, // Return the updated document
                runValidators: true // Run model validators
            }
        );
        
        if (!updatedPost) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }
        
        console.log('✅ Post updated successfully:', id);
        
        res.json({
            success: true,
            message: 'Post updated successfully',
            post: updatedPost
        });
        
    } catch (error) {
        console.error('❌ Error updating post:', error);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }
        
        // Handle duplicate key error - IGNORE
        if (error.code === 11000) {
            console.log('⚠️ Duplicate key error during update, but continuing...');
            
            // Try without the problematic field
            try {
                const { title, ...otherData } = req.body;
                const retryUpdate = await Blog.findByIdAndUpdate(
                    id,
                    otherData,
                    { new: true, runValidators: true }
                );
                
                return res.json({
                    success: true,
                    message: 'Post updated (title unchanged to avoid conflict)',
                    post: retryUpdate
                });
            } catch (retryError) {
                console.error('❌ Retry update failed:', retryError);
            }
        }
        
        res.status(500).json({
            success: false,
            message: 'Error updating post',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Delete a post
exports.deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('🗑️ Deleting post:', id);
        
        const deletedPost = await Blog.findByIdAndDelete(id);
        
        if (!deletedPost) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }
        
        console.log('✅ Post deleted successfully:', id);
        
        res.json({
            success: true,
            message: 'Post deleted successfully'
        });
        
    } catch (error) {
        console.error('❌ Error deleting post:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting post',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// =================================================================
// USER CONTROLLERS (Published posts only)
// =================================================================

// Get published posts with pagination and filtering
exports.getPublishedPosts = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', category = '' } = req.query;
        
        // Build query - only published posts
        let query = { isPublished: true };
        
        // Search functionality
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { summary: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Filter by category
        if (category) {
            query.category = category;
        }
        
        // Get total count
        const total = await Blog.countDocuments(query);
        
        // Get posts with pagination
        const posts = await Blog.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .select('-content'); // Don't send full content in list view
        
        res.json({
            success: true,
            posts,
            count: total,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Error fetching published posts:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching posts',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get a single published post by ID or slug
exports.getPublishedPostById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const post = await Blog.findOne({ 
            _id: id, 
            isPublished: true 
        });
        
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found or not published'
            });
        }
        
        // Increment view count
        post.views += 1;
        await post.save();
        
        res.json({
            success: true,
            post
        });
        
    } catch (error) {
        console.error('Error fetching published post:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching post',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get list of unique categories from published posts
exports.getCategories = async (req, res) => {
    try {
        const categories = await Blog.distinct('category', { isPublished: true });
        
        res.json({
            success: true,
            categories: categories.filter(cat => cat) // Remove null/empty values
        });
        
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching categories',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Helper function to check if string is a valid ObjectId
function isObjectId(str) {
    return /^[0-9a-fA-F]{24}$/.test(str);
}