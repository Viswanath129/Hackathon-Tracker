/**
 * Validation utility for progress update inputs.
 * Enforces teamId and updateText as non-empty strings,
 * and deltaPercentage as a numeric value between -100 and 100.
 * Explicitly rejects boolean values for deltaPercentage.
 */
const validateProgressInput = (input) => {
    if (!input || typeof input !== 'object') {
        return { isValid: false, error: 'Input must be a valid object' };
    }

    const { teamId, updateText, deltaPercentage } = input;

    if (typeof teamId !== 'string' || teamId.trim().length === 0) {
        return { isValid: false, error: 'teamId must be a non-empty string' };
    }

    if (typeof updateText !== 'string' || updateText.trim().length === 0) {
        return { isValid: false, error: 'updateText must be a non-empty string' };
    }

    if (typeof deltaPercentage === 'boolean') {
        return { isValid: false, error: 'deltaPercentage cannot be a boolean' };
    }

    const numericDelta = Number(deltaPercentage);
    if (deltaPercentage === undefined || deltaPercentage === null || isNaN(numericDelta)) {
        return { isValid: false, error: 'deltaPercentage must be a valid number' };
    }

    if (numericDelta < -100 || numericDelta > 100) {
        return { isValid: false, error: 'deltaPercentage must be between -100 and 100' };
    }

    return { isValid: true };
};

module.exports = { validateProgressInput };
