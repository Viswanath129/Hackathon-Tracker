/**
 * Validates progress update input payload.
 * Enforces teamId and updateText as non-empty strings,
 * and deltaPercentage as a numeric value between -100 and 100.
 * Explicitly rejects boolean values for deltaPercentage.
 */
const validateProgressInput = (data) => {
    if (!data || typeof data !== 'object') {
        return { isValid: false, error: 'Invalid or missing input payload' };
    }

    const { teamId, updateText, deltaPercentage } = data;

    if (typeof teamId !== 'string' || teamId.trim() === '') {
        return { isValid: false, error: 'teamId must be a non-empty string' };
    }

    if (typeof updateText !== 'string' || updateText.trim() === '') {
        return { isValid: false, error: 'updateText must be a non-empty string' };
    }

    if (typeof deltaPercentage === 'boolean' || deltaPercentage === null || deltaPercentage === undefined) {
        return { isValid: false, error: 'deltaPercentage must be a numeric value' };
    }

    const numericDelta = Number(deltaPercentage);
    if (isNaN(numericDelta) || typeof deltaPercentage === 'symbol') {
        return { isValid: false, error: 'deltaPercentage must be a valid number' };
    }

    if (numericDelta < -100 || numericDelta > 100) {
        return { isValid: false, error: 'deltaPercentage must be between -100 and 100' };
    }

    return { isValid: true };
};

module.exports = { validateProgressInput };
