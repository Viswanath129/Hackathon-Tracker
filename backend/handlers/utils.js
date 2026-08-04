// backend/handlers/utils.js

const getCorsHeaders = () => {
    const origin = process.env.CORS_ORIGIN || 'http://localhost:5173';
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    };
};

const formatResponse = (statusCode, body) => {
    return {
        statusCode,
        headers: getCorsHeaders(),
        body: JSON.stringify(body)
    };
};

module.exports = {
    getCorsHeaders,
    formatResponse
};
