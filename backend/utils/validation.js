/**
 * Validation utility for progress update payloads
 */
const validateProgressInput = (data) => {
    if (!data || typeof data !== 'object') {
        return { isValid: false, error: 'Input data must be an object' };
    }

    const { teamId, updateText, deltaPercentage } = data;

    if (typeof teamId !== 'string' || teamId.trim() === '') {
        return { isValid: false, error: 'teamId must be a non-empty string' };
    }

    if (typeof updateText !== 'string' || updateText.trim() === '') {
        return { isValid: false, error: 'updateText must be a non-empty string' };
    }

    if (typeof deltaPercentage === 'boolean') {
        return { isValid: false, error: 'deltaPercentage cannot be a boolean' };
    }

    const numericDelta = Number(deltaPercentage);
    if (typeof deltaPercentage === 'undefined' || deltaPercentage === null || isNaN(numericDelta) || typeof deltaPercentage !== 'number') {
        return { isValid: false, error: 'deltaPercentage must be a numeric value' };
    }

    if (numericDelta < -100 || numericDelta > 100) {
        return { isValid: false, error: 'deltaPercentage must be between -100 and 100' };
    }

    return { isValid: true };
};

module.exports = { validateProgressInput };
