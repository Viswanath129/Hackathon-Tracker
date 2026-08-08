/**
 * Standardizes success and error responses with appropriate status codes and CORS headers.
 */
const formatResponse = (statusCode, body) => {
    const origin = process.env.CORS_ORIGIN || "http://localhost:5173";
    return {
        statusCode,
        headers: {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
            "Access-Control-Allow-Headers": "Content-Type,Authorization"
        },
        body: JSON.stringify(body)
    };
};

module.exports = { formatResponse };
