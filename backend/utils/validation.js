/**
 * Validates progress update input parameters.
 * Requirements:
 * - teamId must be a non-empty string.
 * - updateText must be a non-empty string.
 * - deltaPercentage must be a number between -100 and 100 (booleans explicitly rejected).
 */
const validateProgressInput = (teamId, updateText, deltaPercentage) => {
    if (typeof teamId !== 'string' || !teamId.trim()) {
        return { valid: false, error: 'teamId must be a non-empty string' };
    }

    if (typeof updateText !== 'string' || !updateText.trim()) {
        return { valid: false, error: 'updateText must be a non-empty string' };
    }

    if (typeof deltaPercentage === 'boolean' || typeof deltaPercentage !== 'number' || isNaN(deltaPercentage)) {
        return { valid: false, error: 'deltaPercentage must be a numeric value' };
    }

    if (deltaPercentage < -100 || deltaPercentage > 100) {
        return { valid: false, error: 'deltaPercentage must be between -100 and 100' };
    }

    return { valid: true };
};

module.exports = { validateProgressInput };
