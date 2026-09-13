/**
 * Validates progress update input parameters.
 * Enforces non-empty strings for teamId and updateText,
 * and a numeric value between -100 and 100 for deltaPercentage (rejecting booleans).
 */
const validateProgressInput = (data) => {
    if (!data || typeof data !== 'object') {
        return { isValid: false, error: 'Request body is required' };
    }

    const { teamId, updateText, deltaPercentage } = data;

    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return { isValid: false, error: 'teamId must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return { isValid: false, error: 'updateText must be a non-empty string' };
    }

    if (typeof deltaPercentage === 'boolean') {
        return { isValid: false, error: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    const numDelta = Number(deltaPercentage);
    if (deltaPercentage === null || deltaPercentage === undefined || isNaN(numDelta) || numDelta < -100 || numDelta > 100) {
        return { isValid: false, error: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    return { isValid: true };
};

module.exports = { validateProgressInput };
