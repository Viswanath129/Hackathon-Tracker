/**
 * Validates progress update input parameters.
 *
 * Enforces:
 * - teamId: non-empty string
 * - updateText: non-empty string
 * - deltaPercentage: numeric value between -100 and 100 (booleans explicitly rejected)
 */
function validateProgressInput(input) {
    if (!input || typeof input !== 'object') {
        return { isValid: false, error: 'Input must be an object' };
    }

    const { teamId, updateText, deltaPercentage } = input;

    if (typeof teamId !== 'string' || teamId.trim() === '') {
        return { isValid: false, error: 'teamId must be a non-empty string' };
    }

    if (typeof updateText !== 'string' || updateText.trim() === '') {
        return { isValid: false, error: 'updateText must be a non-empty string' };
    }

    if (typeof deltaPercentage === 'boolean' || typeof deltaPercentage !== 'number' || Number.isNaN(deltaPercentage)) {
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
