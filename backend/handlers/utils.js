/**
 * Standardizes API Gateway responses with appropriate status codes and CORS headers.
 */
const formatResponse = (statusCode, body) => {
    return {
        statusCode,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "http://localhost:5173",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token"
        },
        body: typeof body === 'string' ? body : JSON.stringify(body)
    };
};

module.exports = { formatResponse };
