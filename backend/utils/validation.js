/**
 * Validates progress update inputs for team projects.
 * Enforces teamId and updateText as non-empty strings,
 * and deltaPercentage as a numeric value between -100 and 100.
 * Explicitly rejects boolean values.
 */
const validateProgressInput = (data) => {
    if (!data) {
        return { isValid: false, error: 'Request body or payload is missing' };
    }

    const { teamId, updateText, deltaPercentage } = data;

    if (!teamId || typeof teamId !== 'string' || teamId.trim().length === 0) {
        return { isValid: false, error: 'teamId must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim().length === 0) {
        return { isValid: false, error: 'updateText must be a non-empty string' };
    }

    if (deltaPercentage === undefined || deltaPercentage === null) {
        return { isValid: false, error: 'deltaPercentage is required' };
    }

    if (typeof deltaPercentage === 'boolean') {
        return { isValid: false, error: 'deltaPercentage must be a numeric value, not a boolean' };
    }

    const numValue = Number(deltaPercentage);
    if (typeof deltaPercentage !== 'number' && isNaN(numValue)) {
        return { isValid: false, error: 'deltaPercentage must be a numeric value' };
    }

    if (typeof deltaPercentage !== 'number' && typeof deltaPercentage !== 'string') {
        return { isValid: false, error: 'deltaPercentage must be a numeric value' };
    }

    if (isNaN(numValue) || numValue < -100 || numValue > 100) {
        return { isValid: false, error: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    return { isValid: true };
};

module.exports = {
    validateProgressInput
};
