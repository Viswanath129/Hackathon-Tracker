/**
 * Validates progress update inputs.
 * Enforces teamId and updateText as non-empty strings,
 * and deltaPercentage as a numeric value between -100 and 100.
 */
function validateProgressInput(data) {
    const errors = [];
    const { teamId, updateText, deltaPercentage } = data || {};

    if (typeof teamId !== 'string' || !teamId.trim()) {
        errors.push('teamId must be a non-empty string');
    }

    if (typeof updateText !== 'string' || !updateText.trim()) {
        errors.push('updateText must be a non-empty string');
    }

    if (typeof deltaPercentage !== 'number' || isNaN(deltaPercentage) || deltaPercentage < -100 || deltaPercentage > 100) {
        errors.push('deltaPercentage must be a numeric value between -100 and 100');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

module.exports = { validateProgressInput };
