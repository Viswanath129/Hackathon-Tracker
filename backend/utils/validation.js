/**
 * Centralized progress input validation utility
 */
const validateProgressInput = (data) => {
    if (!data) {
        return { isValid: false, message: 'Request body is missing' };
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

    if (typeof deltaPercentage === 'boolean') {
        return { isValid: false, message: 'deltaPercentage cannot be a boolean' };
    }

    const numValue = Number(deltaPercentage);
    if (isNaN(numValue) || typeof deltaPercentage === 'object') {
        return { isValid: false, message: 'deltaPercentage must be a numeric value' };
    }

    if (numValue < -100 || numValue > 100) {
        return { isValid: false, message: 'deltaPercentage must be between -100 and 100' };
    }

    return { isValid: true };
};

module.exports = { validateProgressInput };
