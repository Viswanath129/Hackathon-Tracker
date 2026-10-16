/**
 * Validates progress update input parameters.
 * Enforces non-empty string teamId and updateText,
 * and deltaPercentage as a numeric value between -100 and 100.
 * Explicitly rejects boolean values to avoid type-coercion bypasses.
 */
function validateProgressInput(data) {
    if (!data || typeof data !== 'object') {
        return { valid: false, message: 'Invalid input payload' };
    }

    const { teamId, updateText, deltaPercentage } = data;

    if (!teamId || typeof teamId !== 'string' || teamId.trim().length === 0) {
        return { valid: false, message: 'teamId is required and must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim().length === 0) {
        return { valid: false, message: 'updateText is required and must be a non-empty string' };
    }

    if (deltaPercentage === undefined || deltaPercentage === null) {
        return { valid: false, message: 'deltaPercentage is required' };
    }

    if (typeof deltaPercentage === 'boolean') {
        return { valid: false, message: 'deltaPercentage must be a numeric value, booleans are not allowed' };
    }

    const numericDelta = Number(deltaPercentage);
    if (isNaN(numericDelta) || typeof deltaPercentage === 'object') {
        return { valid: false, message: 'deltaPercentage must be a valid number' };
    }

    if (numericDelta < -100 || numericDelta > 100) {
        return { valid: false, message: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    return { valid: true };
}

module.exports = {
    validateProgressInput
};
