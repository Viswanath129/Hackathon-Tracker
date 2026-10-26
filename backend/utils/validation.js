/**
 * Validates progress update payload.
 *
 * Requirements:
 * - teamId: non-empty string
 * - updateText: non-empty string
 * - deltaPercentage: numeric value between -100 and 100
 * - Explicitly rejects boolean values for deltaPercentage
 */
function validateProgressInput(input) {
    if (!input || typeof input !== 'object') {
        return { isValid: false, message: 'Invalid input payload' };
    }

    const { teamId, updateText, deltaPercentage } = input;

    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return { isValid: false, message: 'teamId is required and must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return { isValid: false, message: 'updateText is required and must be a non-empty string' };
    }

    if (typeof deltaPercentage === 'boolean' || deltaPercentage === null || deltaPercentage === undefined) {
        return { isValid: false, message: 'deltaPercentage must be a number between -100 and 100' };
    }

    const numDelta = Number(deltaPercentage);
    if (isNaN(numDelta) || numDelta < -100 || numDelta > 100) {
        return { isValid: false, message: 'deltaPercentage must be a number between -100 and 100' };
    }

    return { isValid: true };
}

module.exports = { validateProgressInput };
