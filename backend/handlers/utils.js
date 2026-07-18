/**
 * Centralized response formatting utility for Lambda handlers
 * Standardizes success and error responses with appropriate status codes and CORS headers.
 */
function formatResponse(statusCode, data) {
    return {
        statusCode,
        headers: {
            "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "http://localhost:5173",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token"
        },
        body: JSON.stringify(data)
    };
}

module.exports = { formatResponse };
