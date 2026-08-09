/**
 * Standardized success and error response generator for Lambda handlers
 */
const formatResponse = (statusCode, body, headers = {}) => {
    return {
        statusCode,
        headers: {
            'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            ...headers
        },
        body: typeof body === 'string' ? body : JSON.stringify(body)
    };
};

module.exports = { formatResponse };
