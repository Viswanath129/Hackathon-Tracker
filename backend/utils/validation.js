/**
 * Utility function to validate progress update payload.
 *
 * Requirements:
 * - teamId: non-empty string
 * - updateText: non-empty string
 * - deltaPercentage: numeric value between -100 and 100 (boolean values explicitly rejected)
 */
const validateProgressInput = (data) => {
    if (!data || typeof data !== 'object') {
        return { valid: false, message: 'Request body must be a valid JSON object' };
    }

    const { teamId, updateText, deltaPercentage } = data;

    if (typeof teamId !== 'string' || teamId.trim() === '') {
        return { valid: false, message: 'teamId must be a non-empty string' };
    }

    if (typeof updateText !== 'string' || updateText.trim() === '') {
        return { valid: false, message: 'updateText must be a non-empty string' };
    }

    if (typeof deltaPercentage === 'boolean') {
        return { valid: false, message: 'deltaPercentage cannot be a boolean value' };
    }

    if (typeof deltaPercentage === 'symbol' || deltaPercentage === null || deltaPercentage === undefined) {
        return { valid: false, message: 'deltaPercentage must be a valid number' };
    }

    const numericDelta = Number(deltaPercentage);
    if (isNaN(numericDelta)) {
        return { valid: false, message: 'deltaPercentage must be a valid number' };
    }

    if (numericDelta < -100 || numericDelta > 100) {
        return { valid: false, message: 'deltaPercentage must be between -100 and 100' };
    }

    return { valid: true };
};

module.exports = {
    validateProgressInput
};
