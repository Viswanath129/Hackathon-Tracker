/**
 * Centralized validation utility for progress update inputs.
 */
const validateProgressInput = (data) => {
    if (!data || typeof data !== 'object') {
        return { valid: false, message: 'Request body is missing or invalid' };
    }

    const { teamId, updateText, deltaPercentage } = data;

    if (typeof teamId !== 'string' || teamId.trim() === '') {
        return { valid: false, message: 'teamId is required and must be a non-empty string' };
    }

    if (typeof updateText !== 'string' || updateText.trim() === '') {
        return { valid: false, message: 'updateText is required and must be a non-empty string' };
    }

    if (typeof deltaPercentage === 'boolean' || deltaPercentage === null || deltaPercentage === undefined) {
        return { valid: false, message: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    const numDelta = Number(deltaPercentage);
    if (isNaN(numDelta) || numDelta < -100 || numDelta > 100) {
        return { valid: false, message: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    return { valid: true };
};

module.exports = { validateProgressInput };
