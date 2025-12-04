// travel-tour-blog-server/autoIngestion.js

const cron = require('node-cron');
const axios = require('axios');
// FIX: Import the new getter function
const { getManagementEnvironment } = require('./contentful/client');

// --- CONFIGURATION ---
const EXTERNAL_API_URL = 'https://newsapi.org/v2/everything';
const CRON_SCHEDULE = '0 */6 * * *'; 
const AUTHOR_FALLBACK_ID = '4WOacPkmp1DHGgDf1ToJGw'; 
const CONTENT_TYPE_ID = 'theConclaveBlog'; 

const createSlug = (text) => {
    return text.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 60);
};

const createRichTextContent = (content) => {
  return {
    nodeType: 'document',
    data: {},
    content: [
      {
        nodeType: 'paragraph',
        data: {},
        content: [
          {
            nodeType: 'text',
            value: content,
            marks: [],
            data: {},
          },
        ],
      },
    ],
  };
};

/**
 * Main function to run the ingestion process.
 */
const runIngestion = async () => {
    // CRITICAL FIX: Properly await the environment instance by CALLING the function
    let environment; 
    try {
        environment = await getManagementEnvironment(); 
    } catch (e) {
        console.error('[INGEST] Failed to retrieve Contentful Environment:', e.message);
        return;
    }
    
    try {
        console.log(`[INGEST] Starting ingestion job at ${new Date().toISOString()}`);
        
        const newsResponse = await axios.get(EXTERNAL_API_URL, {
          params: {
            q: 'travel AND tourism destination tips', 
            language: 'en',
            pageSize: 5,
            apiKey: process.env.NEWS_API_KEY, 
          },
        });

        const articles = newsResponse.data.articles;
        if (!articles || articles.length === 0) {
          console.log('[INGEST] No new articles found from external API.');
          return;
        }

        let createdCount = 0;

        for (const article of articles) {
          const slug = createSlug(article.title);
          const entryId = `auto-${slug}-${Date.now().toString().slice(-4)}`; 

          if (!article.description || article.content.length < 50) continue;
          
          const richTextContent = createRichTextContent(article.content || article.description);
          
          try {
            // This line now works because 'environment' is the correct CMA object
            const newEntry = await environment.createEntryWithId(
              CONTENT_TYPE_ID, 
              entryId,       
              {
                fields: {
                  title: { 'en-US': article.title.substring(0, 250) },
                  slug: { 'en-US': slug },
                  content: { 'en-US': richTextContent },
                  category: { 'en-US': 'Tourism' }, 
                  publishedDate: { 'en-US': new Date(article.publishedAt).toISOString() },
                  author: {
                    'en-US': { sys: { type: 'Link', linkType: 'Entry', id: AUTHOR_FALLBACK_ID } },
                  },
                },
              }
            );

            await newEntry.publish();
            createdCount++;
            console.log(`[INGEST] Successfully created and published: ${article.title}`);
          } catch (e) {
            console.error(`[INGEST] Error creating entry ${article.title}:`, e.message);
          }
        }

        console.log(`[INGEST] Job finished. Total posts created: ${createdCount}`);

    } catch (error) {
        console.error('[INGEST] CRITICAL Ingestion Job Failed:', error.message);
    }
};

/**
 * Initializes and starts the cron job.
 */
const startIngestionJob = () => {
  cron.schedule(CRON_SCHEDULE, runIngestion, {
    scheduled: true,
    timezone: "Etc/UTC" 
  });
  // Run once immediately when the server starts
  runIngestion(); 
};

module.exports = { 
    startIngestionJob 
};