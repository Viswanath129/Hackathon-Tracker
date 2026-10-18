/**
 * Utility functions for backend input validation.
 */

/**
 * Validates progress update payload.
 * Enforces teamId and updateText as non-empty strings,
 * and deltaPercentage as a numeric value between -100 and 100.
 * Explicitly rejects boolean values for deltaPercentage.
 *
 * @param {Object} input
 * @returns {{ isValid: boolean, error?: string }}
 */
function validateProgressInput(input) {
    if (!input || typeof input !== 'object') {
        return { isValid: false, error: 'Invalid payload: expected an object' };
    }

    const { teamId, updateText, deltaPercentage } = input;

    if (typeof teamId !== 'string' || teamId.trim() === '') {
        return { isValid: false, error: 'teamId must be a non-empty string' };
    }

    if (typeof updateText !== 'string' || updateText.trim() === '') {
        return { isValid: false, error: 'updateText must be a non-empty string' };
    }

    // Explicitly reject boolean values (e.g., true, false)
    if (typeof deltaPercentage === 'boolean') {
        return { isValid: false, error: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    const numericDelta = Number(deltaPercentage);
    if (
        deltaPercentage === null ||
        deltaPercentage === undefined ||
        isNaN(numericDelta) ||
        numericDelta < -100 ||
        numericDelta > 100
    ) {
        return { isValid: false, error: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    return { isValid: true };
}

module.exports = {
    validateProgressInput
};
