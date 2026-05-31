/**
 * Standardizes Lambda responses with appropriate status codes and CORS headers.
 */
const formatResponse = (statusCode, body) => {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
      'Content-Type': 'application/json',
      'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    },
    body: JSON.stringify(body),
  };
};

module.exports = { formatResponse };
