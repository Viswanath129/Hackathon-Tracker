/**
 * Helper utility for serverless Lambda handlers.
 */

const getCorsHeaders = () => ({
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
});

module.exports = { getCorsHeaders };
