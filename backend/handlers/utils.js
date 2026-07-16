/**
 * Centralized utility to standardize success and error responses for Lambda handlers.
 * Standardizes CORS headers and format for response compatibility.
 */
const formatResponse = (statusCode, bodyObj) => {
    const origin = process.env.CORS_ORIGIN || 'http://localhost:5173';
    return {
        statusCode,
        headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyObj)
    };
};

module.exports = { formatResponse };
