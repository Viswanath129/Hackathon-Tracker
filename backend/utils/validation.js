/**
 * Shared validation utility for progress updates.
 *
 * Enforces:
 * - teamId: non-empty string
 * - updateText: non-empty string
 * - deltaPercentage: numeric value between -100 and 100 (explicitly rejecting booleans)
 */
function validateProgressInput(data) {
    if (!data || typeof data !== 'object') {
        return { valid: false, message: 'Invalid request body' };
    }

    const { teamId, updateText, deltaPercentage } = data;

    if (typeof teamId !== 'string' || teamId.trim() === '') {
        return { valid: false, message: 'teamId must be a non-empty string' };
    }

    if (typeof updateText !== 'string' || updateText.trim() === '') {
        return { valid: false, message: 'updateText must be a non-empty string' };
    }

    if (typeof deltaPercentage === 'boolean' || deltaPercentage === null || deltaPercentage === undefined) {
        return { valid: false, message: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    const numDelta = Number(deltaPercentage);
    if (Number.isNaN(numDelta) || numDelta < -100 || numDelta > 100) {
        return { valid: false, message: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    return { valid: true };
}

module.exports = { validateProgressInput };
