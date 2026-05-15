/**
 * Mocking progressService to avoid actual DynamoDB calls during testing.
 * This is done before requiring the handlers to ensure the mock is used.
 */
const progressService = require('../services/progressService');

progressService.logProgress = async (projectId, updateText, deltaPercentage) => {
    console.log(`[MOCK] logProgress called for ${projectId}`);
    return { success: true, timestamp: new Date().toISOString() };
};

progressService.getProgressLogs = async (projectId) => {
    console.log(`[MOCK] getProgressLogs called for ${projectId}`);
    return [{ PK: `PROJ#${projectId}`, SK: 'LOG#2023', update_text: 'Mocked log' }];
};

const progressHandler = require('../handlers/progress');

/**
 * Basic test suite for progress handlers
 */
async function runTests() {
    let failed = false;

    console.log('--- Testing logUpdate ---');
    const logEvent = {
        body: JSON.stringify({
            projectId: 'proj_123',
            updateText: 'Started working on the UI',
            deltaPercentage: 10
        })
    };
    const logResponse = await progressHandler.logUpdate(logEvent);
    console.log('Response:', JSON.stringify(logResponse, null, 2));

    if (logResponse.statusCode === 201 && logResponse.headers['Access-Control-Allow-Origin'] === '*') {
        console.log('✅ logUpdate SUCCESS');
    } else {
        console.error('❌ logUpdate FAILED');
        failed = true;
    }

    console.log('\n--- Testing logUpdate (Validation Error) ---');
    const badLogEvent = { body: JSON.stringify({ projectId: 'proj_123' }) };
    const badLogResponse = await progressHandler.logUpdate(badLogEvent);
    console.log('Response:', JSON.stringify(badLogResponse, null, 2));

    if (badLogResponse.statusCode === 400 && badLogResponse.headers['Access-Control-Allow-Origin'] === '*') {
        console.log('✅ logUpdate Validation SUCCESS');
    } else {
        console.error('❌ logUpdate Validation FAILED');
        failed = true;
    }

    console.log('\n--- Testing getHistory ---');
    const getEvent = {
        pathParameters: {
            teamId: 'proj_123'
        }
    };
    const getResponse = await progressHandler.getHistory(getEvent);
    console.log('Response:', JSON.stringify(getResponse, null, 2));

    if (getResponse.statusCode === 200 && getResponse.headers['Access-Control-Allow-Origin'] === '*') {
        console.log('✅ getHistory SUCCESS');
    } else {
        console.error('❌ getHistory FAILED');
        failed = true;
    }

    if (failed) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Tests failed with error:', err);
    process.exit(1);
});
