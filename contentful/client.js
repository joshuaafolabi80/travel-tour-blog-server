// travel-tour-blog-server/contentful/client.js

const contentful = require('contentful');
const contentfulManagement = require('contentful-management');

// --- 1. Content Delivery Client (CDA) - READ-ONLY ---
const cdaClient = contentful.createClient({
  space: process.env.CONTENTFUL_SPACE_ID,
  accessToken: process.env.CDA_ACCESS_TOKEN,
});

// --- 2. Content Management Client (CMA) - READ/WRITE ---
const cmaClient = contentfulManagement.createClient(
    { accessToken: process.env.CMA_ACCESS_TOKEN },
    { type: 'plain' }
);

/**
 * CRITICAL FIX: Exports an async function that returns the Environment object.
 * This MUST be awaited by all consumers (server.js, autoIngestion.js).
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