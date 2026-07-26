/**
 * Validates progress update inputs.
 * Enforces 'teamId' and 'updateText' as non-empty strings, and 'deltaPercentage' as a numeric value
 * between -100 and 100. Explicitly rejects boolean values for 'deltaPercentage'.
 */
function validateProgressInput(input) {
    if (!input || typeof input !== 'object') {
        return { isValid: false, message: 'Invalid input data' };
    }

    const { teamId, updateText, deltaPercentage } = input;

    if (typeof teamId !== 'string' || teamId.trim() === '') {
        return { isValid: false, message: 'teamId must be a non-empty string' };
    }

    if (typeof updateText !== 'string' || updateText.trim() === '') {
        return { isValid: false, message: 'updateText must be a non-empty string' };
    }

    if (typeof deltaPercentage === 'boolean') {
        return { isValid: false, message: 'deltaPercentage cannot be a boolean' };
    }

    const num = Number(deltaPercentage);
    if (isNaN(num) || typeof deltaPercentage === 'object' || deltaPercentage === null || deltaPercentage === '') {
        return { isValid: false, message: 'deltaPercentage must be a valid number' };
    }

    if (num < -100 || num > 100) {
        return { isValid: false, message: 'deltaPercentage must be between -100 and 100' };
    }

    return { isValid: true };
}

module.exports = { validateProgressInput };
