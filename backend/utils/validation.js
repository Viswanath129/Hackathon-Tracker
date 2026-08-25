/**
 * Validation utility for progress update payloads.
 */
function validateProgressInput(body) {
    if (!body || typeof body !== 'object') {
        return { isValid: false, message: 'Invalid request body' };
    }

    const { teamId, updateText, deltaPercentage } = body;

    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return { isValid: false, message: 'teamId must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return { isValid: false, message: 'updateText must be a non-empty string' };
    }

    if (deltaPercentage === undefined || deltaPercentage === null || typeof deltaPercentage === 'boolean') {
        return { isValid: false, message: 'deltaPercentage must be a numeric value' };
    }

    const numericDelta = Number(deltaPercentage);
    if (isNaN(numericDelta) || numericDelta < -100 || numericDelta > 100) {
        return { isValid: false, message: 'deltaPercentage must be a number between -100 and 100' };
    }

    return { isValid: true };
}

module.exports = {
    validateProgressInput
};
