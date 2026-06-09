/**
 * Standardized response formatter for Lambda handlers
 */
const formatResponse = (statusCode, body) => {
    return {
        statusCode,
        headers: {
            "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    };
};

/**
 * Structured logger for Lambda handlers
 * Format: [LEVEL] [handlerName] message
 */
const logger = {
    info: (handlerName, message) => console.log(`[INFO] [${handlerName}] ${message}`),
    error: (handlerName, message, error) => console.error(`[ERROR] [${handlerName}] ${message}`, error),
    warn: (handlerName, message) => console.warn(`[WARN] [${handlerName}] ${message}`)
};

module.exports = { formatResponse, logger };
