/**
 * Standardizes API responses with CORS headers and logging.
 * @param {number} statusCode - HTTP status code
 * @param {Object} body - Response body object
 * @returns {Object} AWS Lambda response object
 */
const formatResponse = (statusCode, body) => {
    // CORS configuration matches the server.js allowedOrigins where possible
    const allowedOrigin = process.env.CORS_ORIGIN || '*';

    const response = {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': allowedOrigin,
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        },
        body: JSON.stringify(body),
    };

    const level = statusCode >= 400 ? 'ERROR' : 'INFO';
    // Structured logging for CloudWatch/production traceability
    console.log(`[${level}] [formatResponse] Status: ${statusCode}, Body: ${JSON.stringify(body)}`);

    return response;
};

module.exports = { formatResponse };
