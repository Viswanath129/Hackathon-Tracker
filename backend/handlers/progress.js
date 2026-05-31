const { logProgress, getProgressLogs } = require('../services/progressService');
const { formatResponse } = require('./utils');

/**
 * Handler for POST /api/progress/update
 */
const logUpdate = async (event) => {
  console.log('[INFO] [logUpdate] Received progress update request');

  try {
    let body;
    if (typeof event.body === 'string') {
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        console.error('[ERROR] [logUpdate] Malformed JSON in request body');
        return formatResponse(400, { message: 'Invalid JSON' });
      }
    } else {
      body = event.body || {};
    }

    const { teamId, updateText, deltaPercentage } = body;

    // Validation
    if (!teamId || !updateText || deltaPercentage === undefined) {
      console.warn('[WARN] [logUpdate] Missing required fields', { teamId });
      return formatResponse(400, { message: 'Missing required fields: teamId, updateText, deltaPercentage' });
    }

    const parsedDelta = parseFloat(deltaPercentage);
    if (isNaN(parsedDelta) || parsedDelta < 0 || parsedDelta > 100) {
      console.warn('[WARN] [logUpdate] Invalid deltaPercentage', { deltaPercentage });
      return formatResponse(400, { message: 'deltaPercentage must be a number between 0 and 100' });
    }

    const result = await logProgress(teamId, updateText, parsedDelta);

    console.log('[INFO] [logUpdate] Progress logged successfully', { teamId });
    return formatResponse(201, result);

  } catch (error) {
    console.error('[ERROR] [logUpdate] Internal error:', error);
    return formatResponse(500, { message: 'Internal Server Error' });
  }
};

/**
 * Handler for GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
  const teamId = event.pathParameters?.teamId;
  console.log('[INFO] [getHistory] Fetching history', { teamId });

  if (!teamId) {
    console.warn('[WARN] [getHistory] Missing teamId in path parameters');
    return formatResponse(400, { message: 'teamId is required' });
  }

  try {
    const logs = await getProgressLogs(teamId);
    return formatResponse(200, logs);
  } catch (error) {
    console.error('[ERROR] [getHistory] Internal error:', error, { teamId });
    return formatResponse(500, { message: 'Internal Server Error' });
  }
};

module.exports = { logUpdate, getHistory };
