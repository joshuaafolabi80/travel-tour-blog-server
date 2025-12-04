// travel-tour-blog-server/server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer'); // Import multer for file handling
const { cdaClient, managementClient } = require('./contentful/client');
const { startIngestionJob } = require('./autoIngestion');

const app = express();
const PORT = process.env.PORT || 5000;
const CONTENT_TYPE_ID = 'theConclaveBlog'; // Your specified Content Type ID

// Setup multer storage (using memory storage for Contentful upload)
const upload = multer({ storage: multer.memoryStorage() });

// Use the CLIENT_URL from .env (retrieved from Render environment)
const CLIENT_URL = process.env.CLIENT_URL;

// Middleware
// Configure CORS to only allow requests from your authorized frontend domain
app.use(cors({
  origin: CLIENT_URL,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// We only use JSON parser for non-file requests. File requests handled by multer.
app.use(express.json());

// --- Contentful Asset Upload Helper Function ---
const uploadAndLinkAsset = async (file, environment) => {
    if (!file) return null;

    try {
        // 1. Upload the file binary data to Contentful
        let asset = await environment.createAssetFromFiles({
            fields: {
                title: { 'en-US': file.originalname },
                file: {
                    'en-US': {
                        file: file.buffer, // Binary buffer from multer memory storage
                        fileName: file.originalname,
                        contentType: file.mimetype,
                    },
                },
            },
        });
        
        console.log(`[CMA] Asset upload started for: ${file.originalname}`);

        // 2. Process the asset (required before publishing)
        asset = await asset.processForLocale('en-US');
        
        // 3. Publish the processed asset
        asset = await asset.publish();
        
        console.log(`[CMA] Asset published successfully. ID: ${asset.sys.id}`);

        // 4. Return the Asset Link structure
        return {
            'en-US': { sys: { type: 'Link', linkType: 'Asset', id: asset.sys.id } },
        };
    } catch (e) {
        console.error('Error during Contentful Asset upload/publish:', e.message);
        throw new Error('Failed to upload and link image asset.');
    }
};


// --- 1. CDA Endpoint (Public Read Access) ---
// Fetches all published posts for the public frontend.
app.get('/api/blog-posts', async (req, res) => {
  try {
    const entries = await cdaClient.getEntries({
      content_type: CONTENT_TYPE_ID, 
      order: '-fields.publishedDate', // Sort by date descending
      include: 2, // Include linked Author and Featured Image data
    });
    
    // Return only the items array containing the posts
    res.json(entries.items);
  } catch (error) {
    console.error('Error fetching blog posts:', error.message);
    res.status(500).json({ message: 'Failed to fetch content from Contentful.' });
  }
});

// --- 2. CMA Endpoint (Admin Write Access) ---
// Handles POST requests from your Admin panel to create a new post with optional file upload.
app.post('/api/admin/create-post', upload.single('featuredImage'), async (req, res) => {
    // req.file contains the uploaded file buffer (from multer)
    // req.body contains text fields (title, slug, content, etc.)

    const { title, slug, content, authorId, category } = req.body; 
    const featuredImageFile = req.file;

    if (!title || !slug || !content || !authorId || !category) {
      // Clean up file if present but required fields are missing
      if (featuredImageFile) console.warn('File uploaded but post data is incomplete.');
      return res.status(400).json({ message: 'Missing required fields: title, slug, content, authorId, and category.' });
    }

    // Contentful Rich Text format is complex
    const richTextContent = {
        nodeType: 'document',
        data: {},
        content: [
            {
                nodeType: 'paragraph',
                data: {},
                content: [
                    { nodeType: 'text', value: content, marks: [], data: {} },
                ],
            },
        ],
    };

    try {
        const environment = await managementClient;
        let featuredImageLink = null;
        
        // --- 1. Upload Featured Image if provided ---
        if (featuredImageFile) {
            featuredImageLink = await uploadAndLinkAsset(featuredImageFile, environment);
        }

        // --- 2. Create and Publish Entry ---
        const newEntry = await environment.createEntryWithId(
            CONTENT_TYPE_ID, 
            slug,       
            {
                fields: {
                    title: { 'en-US': title },
                    slug: { 'en-US': slug },
                    content: { 'en-US': richTextContent },
                    category: { 'en-US': category },
                    publishedDate: { 'en-US': new Date().toISOString() },
                    // Link the human author entry (using the ID from the frontend)
                    author: {
                        'en-US': { sys: { type: 'Link', linkType: 'Entry', id: authorId } },
                    },
                    // Link the featured image asset (if uploaded)
                    ...(featuredImageLink && { featuredImage: featuredImageLink }),
                },
            }
        );

        // Publish the entry to make it visible
        await newEntry.publish();

        res.status(201).json({ 
            message: 'Blog post created and published successfully!', 
            entryId: newEntry.sys.id 
        });
    } catch (error) {
        console.error('Error creating post in Contentful:', error.message);
        res.status(500).json({ 
            message: 'Failed to create blog post via CMA. Details in server logs.', 
            details: error.message 
        });
    }
});


// Start the CRON job when the server starts
startIngestionJob();

// Start the Express server
app.listen(PORT, () => {
  console.log(`🚀 Express server running on port ${PORT}`);
  console.log('Ingestion job initialized and first run started...');
  console.log(`CORS configured for origin: ${CLIENT_URL || 'Not specified in .env'}`);
});