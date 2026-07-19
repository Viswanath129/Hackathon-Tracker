/**
 * Utility to format Lambda handler responses with standardized headers (including CORS)
 */
const formatResponse = (statusCode, body, headers = {}) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    };

    return {
        statusCode,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            ...headers
        },
        body: typeof body === 'string' ? body : JSON.stringify(body)
    };
};

module.exports = { formatResponse };
