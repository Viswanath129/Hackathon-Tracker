/**
 * Shared validation utility for progress updates.
 * Used by both AWS Lambda handlers and Express controllers.
 */
function validateProgressInput(input) {
    if (!input || typeof input !== 'object') {
        return { isValid: false, error: 'Invalid input payload' };
    }

    const { teamId, updateText, deltaPercentage } = input;

    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return { isValid: false, error: 'teamId must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return { isValid: false, error: 'updateText must be a non-empty string' };
    }

    if (deltaPercentage === undefined || deltaPercentage === null) {
        return { isValid: false, error: 'deltaPercentage is required' };
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
}

module.exports = {
    validateProgressInput
};
