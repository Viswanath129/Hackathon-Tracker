/**
 * Validates progress update payload.
 * Centralized utility shared across Express controllers and Lambda handlers.
 */
const validateProgressInput = (data) => {
    if (!data || typeof data !== 'object') {
        return { valid: false, message: 'Invalid payload' };
    }

    const teamId = data.teamId || data.projectId;
    const { updateText, deltaPercentage } = data;

    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return { valid: false, message: 'teamId (or projectId) is required and must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return { valid: false, message: 'updateText is required and must be a non-empty string' };
    }

    if (deltaPercentage === undefined || deltaPercentage === null) {
        return { valid: false, message: 'deltaPercentage is required' };
    }

    if (typeof deltaPercentage === 'boolean') {
        return { valid: false, message: 'deltaPercentage cannot be a boolean' };
    }

    const numDelta = Number(deltaPercentage);
    if (isNaN(numDelta) || numDelta < -100 || numDelta > 100) {
        return { valid: false, message: 'deltaPercentage must be a number between -100 and 100' };
    }

    return { valid: true };
};

module.exports = { validateProgressInput };
