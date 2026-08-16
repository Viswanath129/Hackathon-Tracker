/**
 * Shared validation utility for progress tracking inputs
 */

const validateProgressInput = (teamId, updateText, deltaPercentage) => {
    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return { valid: false, message: 'teamId is required and must be a non-empty string.' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return { valid: false, message: 'updateText is required and must be a non-empty string.' };
    }

    if (deltaPercentage === undefined || deltaPercentage === null) {
        return { valid: false, message: 'deltaPercentage is required.' };
    }

    if (typeof deltaPercentage === 'boolean') {
        return { valid: false, message: 'deltaPercentage cannot be a boolean value.' };
    }

    const numericDelta = Number(deltaPercentage);
    if (isNaN(numericDelta) || numericDelta < -100 || numericDelta > 100) {
        return { valid: false, message: 'deltaPercentage must be a numeric value between -100 and 100.' };
    }

    return { valid: true };
};

module.exports = {
    validateProgressInput
};
