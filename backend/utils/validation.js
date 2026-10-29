/**
 * Validates progress update payload.
 * Enforces teamId and updateText as non-empty strings,
 * and deltaPercentage as a numeric value between -100 and 100 (rejecting booleans).
 */
function validateProgressInput(body) {
    if (!body || typeof body !== 'object') {
        return { isValid: false, valid: false, error: 'Request body is required', message: 'Request body is required' };
    }

    const { teamId, updateText, deltaPercentage } = body;

    if (teamId === undefined || teamId === null || typeof teamId !== 'string' || teamId.trim() === '') {
        return { isValid: false, valid: false, error: 'Invalid or missing teamId', message: 'Invalid or missing teamId' };
    }

    if (updateText === undefined || updateText === null || typeof updateText !== 'string' || updateText.trim() === '') {
        return { isValid: false, valid: false, error: 'Invalid or missing updateText', message: 'Invalid or missing updateText' };
    }

    if (
        deltaPercentage === undefined ||
        deltaPercentage === null ||
        typeof deltaPercentage === 'boolean' ||
        typeof deltaPercentage !== 'number' ||
        isNaN(deltaPercentage) ||
        deltaPercentage < -100 ||
        deltaPercentage > 100
    ) {
        return { isValid: false, valid: false, error: 'deltaPercentage must be a number between -100 and 100', message: 'deltaPercentage must be a number between -100 and 100' };
    }

    return { isValid: true, valid: true };
}

module.exports = {
    validateProgressInput
};
