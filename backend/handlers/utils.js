/**
 * Centralized formatting response helper for Lambda handlers.
 * Standardizes success and error responses with appropriate status codes and CORS headers.
 */
function formatResponse(statusCode, body) {
    const origin = process.env.CORS_ORIGIN || "http://localhost:5173";

    return {
        statusCode: statusCode,
        headers: {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token"
        },
        body: typeof body === "string" ? body : JSON.stringify(body)
    };
}

module.exports = { formatResponse };
