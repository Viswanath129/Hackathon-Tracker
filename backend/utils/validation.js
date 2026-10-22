/**
 * Validates progress update inputs.
 * Enforces teamId and updateText as non-empty strings,
 * and deltaPercentage as a numeric value between -100 and 100.
 * Explicitly rejects boolean values for deltaPercentage.
 */
const validateProgressInput = (data) => {
    const { teamId, updateText, deltaPercentage } = data || {};

    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return { valid: false, message: 'teamId must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return { valid: false, message: 'updateText must be a non-empty string' };
    }

    if (deltaPercentage === undefined || deltaPercentage === null || typeof deltaPercentage === 'boolean') {
        return { valid: false, message: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    const numericDelta = Number(deltaPercentage);
    if (isNaN(numericDelta) || numericDelta < -100 || numericDelta > 100) {
        return { valid: false, message: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    return { valid: true, data: { teamId: teamId.trim(), updateText: updateText.trim(), deltaPercentage: numericDelta } };
};

module.exports = { validateProgressInput };
