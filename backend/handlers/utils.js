/**
 * Shared utility functions for Lambda handlers
 */

const getCorsHeaders = () => {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
    };
};

const buildResponse = (statusCode, body, extraHeaders = {}) => {
    return {
        statusCode,
        headers: {
            ...getCorsHeaders(),
            ...extraHeaders
        },
        body: typeof body === 'string' ? body : JSON.stringify(body)
    };
};

module.exports = {
    getCorsHeaders,
    buildResponse
};
