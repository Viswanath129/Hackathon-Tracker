/**
 * Validates progress update payload.
 * Enforces teamId and updateText as non-empty strings.
 * Enforces deltaPercentage as a numeric value between -100 and 100.
 * Explicitly rejects boolean values for deltaPercentage to prevent type coercion bugs.
 */
function validateProgressInput(data) {
    if (!data || typeof data !== 'object') {
        return { valid: false, message: 'Invalid payload' };
    }

    const { teamId, updateText, deltaPercentage } = data;

    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return { valid: false, message: 'teamId must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return { valid: false, message: 'updateText must be a non-empty string' };
    }

    if (deltaPercentage === undefined || deltaPercentage === null) {
        return { valid: false, message: 'deltaPercentage is required' };
    }

    if (typeof deltaPercentage === 'boolean') {
        return { valid: false, message: 'deltaPercentage cannot be a boolean' };
    }

    const num = Number(deltaPercentage);
    if (isNaN(num) || typeof deltaPercentage === 'symbol') {
        return { valid: false, message: 'deltaPercentage must be a numeric value' };
    }

    if (num < -100 || num > 100) {
        return { valid: false, message: 'deltaPercentage must be between -100 and 100' };
    }

    return { valid: true };
}

module.exports = { validateProgressInput };
