// travel-tour-blog-server/routes/blogRoutes.js

const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const { upload } = require('../config/cloudinary'); // Import the file upload middleware

// =================================================================
// ADMIN BLOG ROUTES (Accessible via /api/admin/blog/...)
// NOTE: Assume you will later add an authentication middleware (e.g., auth.protect) before these routes.
// =================================================================

// GET all posts (published and drafts)
router.get('/admin/blog/posts', blogController.getAllAdminPosts);

// GET single post by ID (for admin editing)
router.get('/admin/blog/posts/:id', blogController.getAdminPostById);

// POST - Create a new post (uses file upload middleware)
router.post(
    '/admin/blog/posts', 
    upload.single('featuredImage'), // Expects a file field named 'featuredImage'
    blogController.createPost
);

// PUT - Update an existing post (uses file upload middleware)
router.put(
    '/admin/blog/posts/:id', 
    upload.single('featuredImage'), // Expects a file field named 'featuredImage'
    blogController.updatePost
);

// DELETE - Delete a post
router.delete('/admin/blog/posts/:id', blogController.deletePost);


// =================================================================
// USER BLOG ROUTES (Accessible via /api/user/blog/...)
// =================================================================

// GET published posts (with pagination, search, filter)
router.get('/user/blog/posts', blogController.getPublishedPosts);

// GET a single published post by ID (for viewing)
router.get('/user/blog/posts/:id', blogController.getPublishedPostById);

// GET list of unique categories
router.get('/user/blog/categories', blogController.getCategories);


module.exports = router;