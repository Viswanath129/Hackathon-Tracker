/**
 * Validates progress update payload.
 * Enforces teamId and updateText as non-empty strings,
 * and deltaPercentage as a numeric value between -100 and 100 (rejecting booleans).
 */
const validateProgressInput = (data) => {
    if (!data || typeof data !== 'object') {
        return { valid: false, message: 'Invalid or missing request body' };
    }

    const { teamId, updateText, deltaPercentage } = data;

    if (typeof teamId !== 'string' || teamId.trim() === '') {
        return { valid: false, message: 'teamId must be a non-empty string' };
    }

    if (typeof updateText !== 'string' || updateText.trim() === '') {
        return { valid: false, message: 'updateText must be a non-empty string' };
    }

    if (typeof deltaPercentage === 'boolean' || deltaPercentage === null || deltaPercentage === undefined) {
        return { valid: false, message: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    const numDelta = Number(deltaPercentage);
    if (isNaN(numDelta) || numDelta < -100 || numDelta > 100) {
        return { valid: false, message: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    return { valid: true, data: { teamId: teamId.trim(), updateText: updateText.trim(), deltaPercentage: numDelta } };
};

module.exports = { validateProgressInput };
