/**
 * Validation utility for progress updates.
 * Shared between Lambda handlers and Express controllers.
 */

const validateProgressInput = (data) => {
    if (!data || typeof data !== 'object') {
        return { isValid: false, error: 'Invalid input: body must be an object' };
    }

    const { teamId, updateText, deltaPercentage } = data;

    if (!teamId || typeof teamId !== 'string' || teamId.trim().length === 0) {
        return { isValid: false, error: 'teamId is required and must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim().length === 0) {
        return { isValid: false, error: 'updateText is required and must be a non-empty string' };
    }

    if (typeof deltaPercentage === 'boolean') {
        return { isValid: false, error: 'deltaPercentage cannot be a boolean' };
    }

    if (typeof deltaPercentage !== 'number' || Number.isNaN(deltaPercentage)) {
        return { isValid: false, error: 'deltaPercentage must be a numeric value' };
    }

    if (deltaPercentage < -100 || deltaPercentage > 100) {
        return { isValid: false, error: 'deltaPercentage must be between -100 and 100' };
    }

    return { isValid: true };
};

module.exports = { validateProgressInput };
