/**
 * Formats a standardized response for AWS Lambda
 * @param {number} statusCode - HTTP status code
 * @param {object} body - Response body object
 * @returns {object} Standardized Lambda response
 */
const formatResponse = (statusCode, body) => {
    return {
        statusCode,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        },
        body: JSON.stringify(body),
    };
};

module.exports = { formatResponse };
