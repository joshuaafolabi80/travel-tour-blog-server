// travel-tour-blog-server/server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { cdaClient, managementClient } = require('./contentful/client');
const { startIngestionJob } = require('./autoIngestion');

const app = express();
const PORT = process.env.PORT || 5000;
const CONTENT_TYPE_ID = 'theConclaveBlog'; // Your specified Content Type ID

// Use the CLIENT_URL from .env
const CLIENT_URL = process.env.CLIENT_URL;

// Middleware
// Configure CORS to only allow requests from your authorized frontend domain
app.use(cors({
  origin: CLIENT_URL,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// --- 1. CDA Endpoint (Public Read Access) ---
// Fetches all published posts for the public frontend.
app.get('/api/blog-posts', async (req, res) => {
  try {
    const entries = await cdaClient.getEntries({
      content_type: CONTENT_TYPE_ID, 
      order: '-fields.publishedDate', // Sort by date descending
    });
    
    // Return only the items array containing the posts
    res.json(entries.items);
  } catch (error) {
    console.error('Error fetching blog posts:', error.message);
    res.status(500).json({ message: 'Failed to fetch content from Contentful.' });
  }
});

// --- 2. CMA Endpoint (Admin Write Access) ---
// Handles POST requests from your Admin panel to create a new post.
app.post('/api/admin/create-post', async (req, res) => {
  // Ensure your Admin frontend sends authorId (for a human author) and imageUrl (optional)
  const { title, slug, content, authorId, category, imageUrl } = req.body; 

  if (!title || !slug || !content || !authorId || !category) {
    return res.status(400).json({ message: 'Missing required fields: title, slug, content, authorId, and category.' });
  }

  // Contentful Rich Text format is complex and requires specific JSON.
  const richTextContent = {
    nodeType: 'document',
    data: {},
    content: [
      {
        nodeType: 'paragraph',
        data: {},
        content: [
          {
            nodeType: 'text',
            value: content, // Simple text from the Admin form
            marks: [],
            data: {},
          },
        ],
      },
    ],
  };

  try {
    const environment = await managementClient;
    
    // Create the new entry using the slug as the unique ID
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
          // Link the human author entry
          author: {
            'en-US': { sys: { type: 'Link', linkType: 'Entry', id: authorId } },
          },
          // Featured Image logic would go here if you uploaded the image to Contentful first
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
        message: 'Failed to create blog post via CMA.', 
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