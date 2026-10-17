/**
 * Utility for validating progress update inputs
 */
const validateProgressInput = (input) => {
    if (!input || typeof input !== 'object') {
        return { isValid: false, error: 'Invalid input payload' };
    }

    const { teamId, updateText, deltaPercentage } = input;

    if (typeof teamId !== 'string' || teamId.trim() === '') {
        return { isValid: false, error: 'teamId must be a non-empty string' };
    }

    if (typeof updateText !== 'string' || updateText.trim() === '') {
        return { isValid: false, error: 'updateText must be a non-empty string' };
    }

    if (deltaPercentage === undefined || deltaPercentage === null || typeof deltaPercentage === 'boolean') {
        return { isValid: false, error: 'deltaPercentage must be a numeric value' };
    }

    const numDelta = Number(deltaPercentage);
    if (isNaN(numDelta) || numDelta < -100 || numDelta > 100) {
        return { isValid: false, error: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    return { isValid: true };
};

module.exports = { validateProgressInput };
