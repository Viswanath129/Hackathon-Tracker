/**
 * Shared validation utility for progress tracking inputs.
 * Ensures consistent validation across Lambda handlers and Express controllers.
 */
function validateProgressInput(data) {
    if (!data || typeof data !== 'object') {
        return { valid: false, message: 'Invalid payload' };
    }

    const { teamId, updateText, deltaPercentage } = data;

    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return { valid: false, message: 'teamId is required and must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return { valid: false, message: 'updateText is required and must be a non-empty string' };
    }

    if (
        deltaPercentage === undefined ||
        deltaPercentage === null ||
        typeof deltaPercentage === 'boolean' ||
        typeof deltaPercentage !== 'number' ||
        isNaN(deltaPercentage) ||
        deltaPercentage < -100 ||
        deltaPercentage > 100
    ) {
        return { valid: false, message: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    return { valid: true };
}

module.exports = { validateProgressInput };
