/**
 * Validates progress update inputs.
 * Enforces 'teamId' and 'updateText' as non-empty strings,
 * and 'deltaPercentage' as a numeric value between -100 and 100.
 * Explicitly rejects boolean values for 'deltaPercentage'.
 */
const validateProgressInput = (input) => {
    if (!input) {
        return { valid: false, error: "Request body is missing" };
    }
    const { teamId, updateText, deltaPercentage } = input;

    if (typeof teamId !== 'string' || teamId.trim() === '') {
        return { valid: false, error: "teamId must be a non-empty string" };
    }

    if (typeof updateText !== 'string' || updateText.trim() === '') {
        return { valid: false, error: "updateText must be a non-empty string" };
    }

    if (typeof deltaPercentage === 'boolean') {
        return { valid: false, error: "deltaPercentage cannot be a boolean" };
    }

    // Check if it is a valid numeric value
    const num = Number(deltaPercentage);
    if (
        (typeof deltaPercentage !== 'number' && typeof deltaPercentage !== 'string') ||
        isNaN(num) ||
        deltaPercentage === null ||
        (typeof deltaPercentage === 'string' && deltaPercentage.trim() === '')
    ) {
        return { valid: false, error: "deltaPercentage must be a numeric value" };
    }

    if (num < -100 || num > 100) {
        return { valid: false, error: "deltaPercentage must be between -100 and 100" };
    }

    return { valid: true };
};

module.exports = { validateProgressInput };
