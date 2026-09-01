/**
 * Centralized validation utility for progress updates.
 *
 * Requirements:
 * - teamId must be a non-empty string.
 * - updateText must be a non-empty string.
 * - deltaPercentage must be a numeric value between -100 and 100.
 * - Boolean values for deltaPercentage are explicitly rejected (e.g. typeof === 'boolean').
 */
function validateProgressInput({ teamId, updateText, deltaPercentage }) {
    const errors = [];

    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        errors.push('teamId is required and must be a non-empty string');
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        errors.push('updateText is required and must be a non-empty string');
    }

    if (deltaPercentage === undefined || deltaPercentage === null) {
        errors.push('deltaPercentage is required');
    } else if (typeof deltaPercentage === 'boolean') {
        errors.push('deltaPercentage must be a numeric value between -100 and 100');
    } else {
        const numDelta = Number(deltaPercentage);
        if (isNaN(numDelta) || numDelta < -100 || numDelta > 100) {
            errors.push('deltaPercentage must be a numeric value between -100 and 100');
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

module.exports = { validateProgressInput };
