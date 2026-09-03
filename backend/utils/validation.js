/**
 * Validates inputs for progress logging operations.
 *
 * Checks:
 * - teamId: Non-empty string
 * - updateText: Non-empty string
 * - deltaPercentage: Numeric value between -100 and 100 (booleans explicitly rejected)
 *
 * @param {Object} input - Input payload containing teamId, updateText, deltaPercentage
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateProgressInput({ teamId, updateText, deltaPercentage }) {
    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return { isValid: false, error: 'teamId is required and must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return { isValid: false, error: 'updateText is required and must be a non-empty string' };
    }

    if (deltaPercentage === undefined || deltaPercentage === null) {
        return { isValid: false, error: 'deltaPercentage is required' };
    }

    if (typeof deltaPercentage === 'boolean') {
        return { isValid: false, error: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    const numDelta = Number(deltaPercentage);
    if (isNaN(numDelta) || numDelta < -100 || numDelta > 100) {
        return { isValid: false, error: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    return { isValid: true, error: null };
}

module.exports = {
    validateProgressInput
};
