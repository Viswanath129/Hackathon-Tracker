/**
 * Standard utility for formatting Lambda responses with CORS headers
 */
const formatResponse = (statusCode, body, handlerName = 'unknown') => {
    const response = {
        statusCode,
        headers: {
            'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Content-Type': 'application/json'
        },
        body: typeof body === 'string' ? body : JSON.stringify(body)
    };

    const level = statusCode >= 400 ? 'ERROR' : 'INFO';
    console.log(`[${level}] [${handlerName}] Response: ${statusCode}`);

    return response;
};

module.exports = { formatResponse };
