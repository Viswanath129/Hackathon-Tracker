/**
 * Validates progress update payload.
 *
 * @param {Object} input
 * @param {string} input.teamId - The target project/team identifier
 * @param {string} input.updateText - Descriptive progress note
 * @param {number} input.deltaPercentage - Numeric delta percentage change (-100 to 100)
 * @returns {{ valid: boolean, message?: string }}
 */
function validateProgressInput(input) {
    if (!input || typeof input !== 'object') {
        return { valid: false, message: 'Invalid payload' };
    }

    const { teamId, updateText, deltaPercentage } = input;

    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return { valid: false, message: 'teamId is required and must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return { valid: false, message: 'updateText is required and must be a non-empty string' };
    }

    if (deltaPercentage === undefined || deltaPercentage === null) {
        return { valid: false, message: 'deltaPercentage is required' };
    }

    if (typeof deltaPercentage === 'boolean' || typeof deltaPercentage !== 'number' || Number.isNaN(deltaPercentage)) {
        return { valid: false, message: 'deltaPercentage must be a numeric value' };
    }

    if (deltaPercentage < -100 || deltaPercentage > 100) {
        return { valid: false, message: 'deltaPercentage must be between -100 and 100' };
    }

    return { valid: true };
}

module.exports = {
    validateProgressInput
};
