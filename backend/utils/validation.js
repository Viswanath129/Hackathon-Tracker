/**
 * Validates progress update inputs.
 * Ensures teamId and updateText are non-empty strings,
 * and deltaPercentage is a numeric value between -100 and 100 (and not a boolean).
 */
function validateProgressInput(data) {
    if (!data || typeof data !== 'object') {
        return { isValid: false, message: 'Invalid input data' };
    }

    const { teamId, updateText, deltaPercentage } = data;

    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return { isValid: false, message: 'teamId must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return { isValid: false, message: 'updateText must be a non-empty string' };
    }

    if (typeof deltaPercentage === 'boolean') {
        return { isValid: false, message: 'deltaPercentage cannot be a boolean' };
    }

    const numericDelta = Number(deltaPercentage);
    if (deltaPercentage === null || deltaPercentage === undefined || isNaN(numericDelta)) {
        return { isValid: false, message: 'deltaPercentage must be a valid number' };
    }

    if (numericDelta < -100 || numericDelta > 100) {
        return { isValid: false, message: 'deltaPercentage must be between -100 and 100' };
    }

    return { isValid: true };
}

module.exports = { validateProgressInput };
