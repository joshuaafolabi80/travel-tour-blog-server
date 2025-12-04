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
// This client is used to access the Space and Environment
const cmaClient = contentfulManagement.createClient(
    { accessToken: process.env.CMA_ACCESS_TOKEN },
    { type: 'plain' }
);

/**
 * Helper function to retrieve the Contentful environment instance (asynchronously).
 * This ensures the object with management methods is ready before use.
 */
const getManagementEnvironment = async () => {
    return cmaClient.environment.get({
        spaceId: process.env.CONTENTFUL_SPACE_ID,
        environmentId: 'master' 
    });
};


module.exports = {
  cdaClient,
  // Export the function instead of the unresolved Promise
  getManagementEnvironment, 
};