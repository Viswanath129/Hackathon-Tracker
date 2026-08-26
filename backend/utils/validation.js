/**
 * Utility for validating progress update inputs.
 * Enforces non-empty strings for teamId and updateText,
 * and a numeric value between -100 and 100 for deltaPercentage (explicitly rejecting booleans).
 */
const validateProgressInput = (data) => {
    if (!data || typeof data !== 'object') {
        return { valid: false, error: 'Invalid input payload' };
    }

    const { teamId, updateText, deltaPercentage } = data;

    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return { valid: false, error: 'teamId must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return { valid: false, error: 'updateText must be a non-empty string' };
    }

    if (
        deltaPercentage === undefined ||
        deltaPercentage === null ||
        typeof deltaPercentage === 'boolean' ||
        typeof deltaPercentage !== 'number' ||
        isNaN(deltaPercentage)
    ) {
        return { valid: false, error: 'deltaPercentage must be a numeric value' };
    }

    if (deltaPercentage < -100 || deltaPercentage > 100) {
        return { valid: false, error: 'deltaPercentage must be between -100 and 100' };
    }

    return { valid: true };
};

module.exports = { validateProgressInput };
