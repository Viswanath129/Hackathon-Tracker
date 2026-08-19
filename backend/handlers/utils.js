/**
 * Lambda response and CORS helper functions
 */

const getCorsHeaders = () => {
    return {
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
    };
};

const buildResponse = (statusCode, body) => {
    return {
        statusCode,
        headers: getCorsHeaders(),
        body: typeof body === 'string' ? body : JSON.stringify(body)
    };
};

module.exports = {
    getCorsHeaders,
    buildResponse
};
