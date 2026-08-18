/**
 * Standard CORS headers for Lambda responses
 */
const getCorsHeaders = () => {
    return {
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    };
};

module.exports = { getCorsHeaders };
