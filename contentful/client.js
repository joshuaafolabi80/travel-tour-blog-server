// travel-tour-blog-server/contentful/client.js

const contentful = require('contentful');
const contentfulManagement = require('contentful-management');

// --- 1. Content Delivery Client (CDA) - READ-ONLY ---
// Used by the Express server to fetch published blog posts for the public frontend.
const cdaClient = contentful.createClient({
  space: process.env.CONTENTFUL_SPACE_ID,
  accessToken: process.env.CDA_ACCESS_TOKEN,
});

// --- 2. Content Management Client (CMA) - READ/WRITE ---
// Used by the autoIngestion script and the Admin POST endpoint to create/publish entries.
const cmaClient = contentfulManagement.createClient(
    { accessToken: process.env.CMA_ACCESS_TOKEN },
    { type: 'plain' }
);

// We scope the CMA client to the specific space and 'master' environment
const managementClient = cmaClient.environment.get({
    spaceId: process.env.CONTENTFUL_SPACE_ID,
    environmentId: 'master' 
});

module.exports = {
  cdaClient,
  managementClient,
};