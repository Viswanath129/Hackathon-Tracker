/**
 * Helper utilities for AWS Lambda handlers
 */

const getCorsHeaders = () => ({
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
});

const buildResponse = (statusCode, body) => ({
    statusCode,
    headers: getCorsHeaders(),
    body: JSON.stringify(body)
});

module.exports = {
    getCorsHeaders,
    buildResponse
};
