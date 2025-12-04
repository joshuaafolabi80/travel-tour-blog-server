// travel-tour-blog-server/server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer'); 
// FIX: Change import from 'managementClient' to 'getManagementEnvironment'
const { cdaClient, getManagementEnvironment } = require('./contentful/client');
const { startIngestionJob } = require('./autoIngestion');

const app = express();
const PORT = process.env.PORT || 5000;
const CONTENT_TYPE_ID = 'theConclaveBlog'; 

// Setup multer storage (using memory storage for Contentful upload)
const upload = multer({ storage: multer.memoryStorage() });

// Use the CLIENT_URL from .env (retrieved from Render environment)
const CLIENT_URL = process.env.CLIENT_URL;

// Middleware
app.use(cors({
  origin: CLIENT_URL,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// --- Contentful Asset Upload Helper Function ---
const uploadAndLinkAsset = async (file, environment) => {
    if (!file) return null;
    // ... (rest of the asset upload logic remains the same) ...
    try {
        let asset = await environment.createAssetFromFiles({
            fields: {
                title: { 'en-US': file.originalname },
                file: {
                    'en-US': {
                        file: file.buffer, 
                        fileName: file.originalname,
                        contentType: file.mimetype,
                    },
                },
            },
        });
        
        console.log(`[CMA] Asset upload started for: ${file.originalname}`);
        asset = await asset.processForLocale('en-US');
        asset = await asset.publish();
        console.log(`[CMA] Asset published successfully. ID: ${asset.sys.id}`);

        return {
            'en-US': { sys: { type: 'Link', linkType: 'Asset', id: asset.sys.id } },
        };
    } catch (e) {
        console.error('Error during Contentful Asset upload/publish:', e.message);
        throw new Error('Failed to upload and link image asset.');
    }
};


// --- 1. CDA Endpoint (Public Read Access) ---
app.get('/api/blog-posts', async (req, res) => {
  // ... (CDA logic remains the same) ...
  try {
    const entries = await cdaClient.getEntries({
      content_type: CONTENT_TYPE_ID, 
      order: '-fields.publishedDate', 
      include: 2, 
    });
    res.json(entries.items);
  } catch (error) {
    console.error('Error fetching blog posts:', error.message);
    res.status(500).json({ message: 'Failed to fetch content from Contentful.' });
  }
});

// --- 2. CMA Endpoint (Admin Write Access) ---
app.post('/api/admin/create-post', upload.single('featuredImage'), async (req, res) => {
    const { title, slug, content, authorId, category } = req.body; 
    const featuredImageFile = req.file;

    if (!title || !slug || !content || !authorId || !category) {
      if (featuredImageFile) console.warn('File uploaded but post data is incomplete.');
      return res.status(400).json({ message: 'Missing required fields: title, slug, content, authorId, and category.' });
    }

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
        // CRITICAL FIX: Call the getter function to get the resolved environment object
        const environment = await getManagementEnvironment(); // <--- FIX IS HERE
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
                    author: {
                        'en-US': { sys: { type: 'Link', linkType: 'Entry', id: authorId } },
                    },
                    ...(featuredImageLink && { featuredImage: featuredImageLink }),
                },
            }
        );

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