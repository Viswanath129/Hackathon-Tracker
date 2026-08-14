/**
 * Validates progress update payload.
 *
 * @param {Object} input
 * @param {string} input.teamId
 * @param {string} input.updateText
 * @param {number|string} input.deltaPercentage
 * @returns {{ isValid: boolean, error?: string }}
 */
const validateProgressInput = (input) => {
    if (!input || typeof input !== 'object') {
        return { isValid: false, error: 'Input body is required and must be an object' };
    }

    const { teamId, updateText, deltaPercentage } = input;

    if (!teamId || typeof teamId !== 'string' || teamId.trim().length === 0) {
        return { isValid: false, error: 'teamId must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim().length === 0) {
        return { isValid: false, error: 'updateText must be a non-empty string' };
    }

    if (typeof deltaPercentage === 'boolean') {
        return { isValid: false, error: 'deltaPercentage cannot be a boolean' };
    }

    if (deltaPercentage === null || deltaPercentage === undefined || typeof deltaPercentage === 'object') {
        return { isValid: false, error: 'deltaPercentage is required and must be numeric' };
    }

    const numDelta = Number(deltaPercentage);
    if (isNaN(numDelta) || !isFinite(numDelta)) {
        return { isValid: false, error: 'deltaPercentage must be a valid number' };
    }

    if (numDelta < -100 || numDelta > 100) {
        return { isValid: false, error: 'deltaPercentage must be between -100 and 100' };
    }

    return { isValid: true };
};

module.exports = { validateProgressInput };
