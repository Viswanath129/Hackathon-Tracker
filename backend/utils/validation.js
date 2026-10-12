/**
 * Shared progress update validation utility
 */
const validateProgressInput = (data) => {
    if (!data || typeof data !== 'object') {
        return { valid: false, error: 'Input data is required' };
    }

    const { teamId, updateText, deltaPercentage } = data;

    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return { valid: false, error: 'teamId must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return { valid: false, error: 'updateText must be a non-empty string' };
    }

    if (deltaPercentage === undefined || deltaPercentage === null) {
        return { valid: false, error: 'deltaPercentage is required' };
    }

    if (typeof deltaPercentage === 'boolean') {
        return { valid: false, error: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    const numDelta = Number(deltaPercentage);
    if (isNaN(numDelta) || typeof deltaPercentage === 'symbol' || typeof deltaPercentage === 'object') {
        return { valid: false, error: 'deltaPercentage must be a valid number' };
    }

    if (numDelta < -100 || numDelta > 100) {
        return { valid: false, error: 'deltaPercentage must be between -100 and 100' };
    }

    return { valid: true };
};

module.exports = { validateProgressInput };
