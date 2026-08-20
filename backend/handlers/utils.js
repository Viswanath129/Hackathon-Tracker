/**
 * Utility functions for AWS Lambda HTTP responses.
 */

const getCorsHeaders = () => {
    return {
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
            'Content-Type': 'application/json',
            ...extraHeaders
        },
        body: typeof body === 'string' ? body : JSON.stringify(body)
    };
};

const buildErrorResponse = (statusCode, message, extraHeaders = {}) => {
    return buildResponse(statusCode, { message }, extraHeaders);
};

module.exports = {
    getCorsHeaders,
    buildResponse,
    buildErrorResponse
};
