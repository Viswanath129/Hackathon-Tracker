/**
 * Common Lambda response utility
 */
exports.formatResponse = (statusCode, body) => {
    return {
        statusCode,
        headers: {
            'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    };
};
