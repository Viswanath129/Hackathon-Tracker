/**
 * Utility function to validate progress update payload.
 * Enforces teamId and updateText as non-empty strings,
 * and deltaPercentage as a numeric value between -100 and 100.
 * Explicitly rejects boolean values for deltaPercentage.
 */
const validateProgressInput = (data) => {
    if (!data || typeof data !== 'object') {
        return { isValid: false, message: 'Input data must be an object' };
    }

    const { teamId, updateText, deltaPercentage } = data;

    if (typeof teamId !== 'string' || teamId.trim() === '') {
        return { isValid: false, message: 'teamId must be a non-empty string' };
    }

    if (typeof updateText !== 'string' || updateText.trim() === '') {
        return { isValid: false, message: 'updateText must be a non-empty string' };
    }

    if (deltaPercentage === undefined || deltaPercentage === null) {
        return { isValid: false, message: 'deltaPercentage is required' };
    }

    // Explicitly reject boolean values to prevent type-coercion bypass bugs like Number(true) === 1
    if (typeof deltaPercentage === 'boolean') {
        return { isValid: false, message: 'deltaPercentage must be a numeric value, not a boolean' };
    }

    const deltaNum = Number(deltaPercentage);
    if (isNaN(deltaNum) || deltaNum < -100 || deltaNum > 100) {
        return { isValid: false, message: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    return { isValid: true };
};

module.exports = { validateProgressInput };
