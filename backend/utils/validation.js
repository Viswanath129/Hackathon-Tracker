/**
 * Utility to validate progress update inputs.
 * Enforces teamId and updateText as non-empty strings,
 * and deltaPercentage as a numeric value between -100 and 100 (explicitly rejecting booleans).
 */
const validateProgressInput = ({ teamId, updateText, deltaPercentage }) => {
    if (typeof teamId !== 'string' || teamId.trim() === '') {
        return { valid: false, message: 'teamId must be a non-empty string' };
    }
    if (typeof updateText !== 'string' || updateText.trim() === '') {
        return { valid: false, message: 'updateText must be a non-empty string' };
    }
    if (typeof deltaPercentage === 'boolean' || typeof deltaPercentage !== 'number' || isNaN(deltaPercentage)) {
        return { valid: false, message: 'deltaPercentage must be a numeric value' };
    }
    if (deltaPercentage < -100 || deltaPercentage > 100) {
        return { valid: false, message: 'deltaPercentage must be between -100 and 100' };
    }
    return { valid: true };
};

module.exports = { validateProgressInput };
