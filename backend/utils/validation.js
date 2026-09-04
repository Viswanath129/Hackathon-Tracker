/**
 * Centralized validation utilities for progress tracking requests.
 */

const validateProgressInput = ({ teamId, updateText, deltaPercentage }) => {
    const errors = [];

    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        errors.push('teamId must be a non-empty string');
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        errors.push('updateText must be a non-empty string');
    }

    if (
        deltaPercentage === undefined ||
        deltaPercentage === null ||
        typeof deltaPercentage === 'boolean' ||
        typeof Number(deltaPercentage) !== 'number' ||
        isNaN(Number(deltaPercentage))
    ) {
        errors.push('deltaPercentage must be a valid numeric value');
    } else {
        const numDelta = Number(deltaPercentage);
        if (numDelta < -100 || numDelta > 100) {
            errors.push('deltaPercentage must be between -100 and 100');
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

module.exports = {
    validateProgressInput
};
