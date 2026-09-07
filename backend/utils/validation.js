/**
 * Shared progress update input validation utility
 */
function validateProgressInput(input) {
    if (!input || typeof input !== 'object') {
        return { isValid: false, error: 'Invalid request payload' };
    }

    const { teamId, updateText, deltaPercentage } = input;

    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return { isValid: false, error: 'teamId is required and must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return { isValid: false, error: 'updateText is required and must be a non-empty string' };
    }

    if (deltaPercentage === undefined || deltaPercentage === null || typeof deltaPercentage === 'boolean') {
        return { isValid: false, error: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    const numDelta = Number(deltaPercentage);
    if (typeof deltaPercentage !== 'number' && isNaN(numDelta)) {
        return { isValid: false, error: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    if (isNaN(numDelta) || numDelta < -100 || numDelta > 100) {
        return { isValid: false, error: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    return { isValid: true };
}

module.exports = { validateProgressInput };
