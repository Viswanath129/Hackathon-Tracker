/**
 * Validate input for progress update logging.
 *
 * Requirements:
 * - teamId: non-empty string
 * - updateText: non-empty string
 * - deltaPercentage: numeric value between -100 and 100 (explicitly reject booleans)
 */
const validateProgressInput = (data) => {
    if (!data || typeof data !== 'object') {
        return { valid: false, message: 'Invalid payload format' };
    }

    const { teamId, updateText, deltaPercentage } = data;

    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return { valid: false, message: 'teamId must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return { valid: false, message: 'updateText must be a non-empty string' };
    }

    if (typeof deltaPercentage === 'boolean') {
        return { valid: false, message: 'deltaPercentage cannot be a boolean' };
    }

    const numDelta = Number(deltaPercentage);
    if (deltaPercentage === null || deltaPercentage === undefined || isNaN(numDelta)) {
        return { valid: false, message: 'deltaPercentage must be a valid number' };
    }

    if (numDelta < -100 || numDelta > 100) {
        return { valid: false, message: 'deltaPercentage must be between -100 and 100' };
    }

    return { valid: true };
};

module.exports = {
    validateProgressInput
};
