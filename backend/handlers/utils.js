/**
 * Centralized Lambda formatResponse utility
 * Standardizes success and error responses with appropriate status codes and CORS headers.
 */
const formatResponse = (statusCode, body) => {
    const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

    const headers = {
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
    };

    let responseBody = body;
    if (statusCode === 500) {
        responseBody = { error: "Internal Server Error" };
    }

    return {
        statusCode,
        headers,
        body: JSON.stringify(responseBody)
    };
};

module.exports = { formatResponse };
