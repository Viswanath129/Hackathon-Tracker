/**
 * Centralized response formatter for Lambda handlers.
 * Standardizes success and error responses with appropriate status codes and CORS headers.
 * Access-Control-Allow-Credentials is omitted as it is incompatible with wildcard origins.
 */
const formatResponse = (statusCode, body) => {
    return {
        statusCode,
        headers: {
            "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "http://localhost:5173",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
        },
        body: typeof body === 'string' ? body : JSON.stringify(body)
    };
};

module.exports = { formatResponse };
