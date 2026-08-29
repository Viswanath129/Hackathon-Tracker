/**
 * Utility for validating progress update payload.
 * Enforces non-empty string for teamId (or projectId) and updateText,
 * and a numeric deltaPercentage between -100 and 100 (explicitly rejecting booleans).
 */
const validateProgressInput = (data) => {
    if (!data || typeof data !== 'object') {
        return { valid: false, message: 'Invalid payload: expected JSON object' };
    }

    const teamId = data.teamId || data.projectId;
    const updateText = data.updateText || data.update_text;
    const deltaPercentage = data.deltaPercentage !== undefined ? data.deltaPercentage : data.delta_percentage;

    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return { valid: false, message: 'teamId must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return { valid: false, message: 'updateText must be a non-empty string' };
    }

    if (deltaPercentage === undefined || deltaPercentage === null) {
        return { valid: false, message: 'deltaPercentage is required' };
    }

    if (typeof deltaPercentage === 'boolean') {
        return { valid: false, message: 'deltaPercentage must be a numeric value, booleans are not allowed' };
    }

    const numDelta = Number(deltaPercentage);
    if (isNaN(numDelta) || typeof deltaPercentage === 'symbol') {
        return { valid: false, message: 'deltaPercentage must be a valid number' };
    }

    if (numDelta < -100 || numDelta > 100) {
        return { valid: false, message: 'deltaPercentage must be between -100 and 100' };
    }

    return { valid: true };
};

module.exports = {
    validateProgressInput
};
