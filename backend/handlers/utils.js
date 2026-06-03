/**
 * Utility to format Lambda proxy responses with standardized headers (CORS)
 */
const formatResponse = (statusCode, body) => {
    return {
        statusCode,
        headers: {
            "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
            "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    };
};

module.exports = { formatResponse };
