const { logUpdate, getHistory } = require("../controllers/progressController");
const { formatResponse } = require("./utils");

/**
 * AWS Lambda Adapter for progress tracking handlers.
 * Maps Lambda events to Express-like req/res for controller reuse.
 */
const lambdaAdapter = (controllerFn) => async (event) => {
    const req = {
        body: typeof event.body === "string" ? JSON.parse(event.body || "{}") : (event.body || {}),
        params: event.pathParameters || {},
        query: event.queryStringParameters || {},
        user: event.requestContext?.authorizer?.claims || {} // Cognito claims
    };

    let response = {};
    const res = {
        status: (code) => {
            response.statusCode = code;
            return res;
        },
        json: (data) => {
            response.body = data;
            return res;
        }
    };

    try {
        await controllerFn(req, res);
        return formatResponse(response.statusCode || 200, response.body);
    } catch (error) {
        console.error(`[ERROR] [lambdaAdapter] ${error.message}`);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

module.exports = {
    logUpdate: lambdaAdapter(logUpdate),
    getHistory: lambdaAdapter(getHistory)
};
