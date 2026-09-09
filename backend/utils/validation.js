/**
 * Shared progress update validation utility
 */
const validateProgressInput = (input) => {
    if (!input || typeof input !== 'object') {
        return { valid: false, error: 'Input must be an object' };
    }

    const teamId = input.teamId || input.projectId;
    const { updateText, deltaPercentage } = input;

    if (!teamId || typeof teamId !== 'string' || !teamId.trim()) {
        return { valid: false, error: 'teamId must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || !updateText.trim()) {
        return { valid: false, error: 'updateText must be a non-empty string' };
    }

    if (deltaPercentage === undefined || deltaPercentage === null) {
        return { valid: false, error: 'deltaPercentage is required' };
    }

    // Explicitly reject boolean values to prevent type-coercion bypass (e.g., Number(true) === 1)
    if (typeof deltaPercentage === 'boolean') {
        return { valid: false, error: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    const numDelta = Number(deltaPercentage);
    if (typeof deltaPercentage === 'symbol' || isNaN(numDelta) || numDelta < -100 || numDelta > 100) {
        return { valid: false, error: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    return { valid: true };
};

module.exports = { validateProgressInput };
