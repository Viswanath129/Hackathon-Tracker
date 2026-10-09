/**
 * Validates progress update input parameters.
 *
 * @param {Object} input
 * @param {string} input.teamId
 * @param {string} input.updateText
 * @param {number} input.deltaPercentage
 * @returns {{ valid: boolean, message?: string }}
 */
function validateProgressInput({ teamId, updateText, deltaPercentage } = {}) {
    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return { valid: false, message: 'teamId is required and must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return { valid: false, message: 'updateText is required and must be a non-empty string' };
    }

    if (
        typeof deltaPercentage !== 'number' ||
        typeof deltaPercentage === 'boolean' ||
        isNaN(deltaPercentage) ||
        deltaPercentage < -100 ||
        deltaPercentage > 100
    ) {
        return { valid: false, message: 'deltaPercentage must be a number between -100 and 100' };
    }

    return { valid: true };
}

module.exports = { validateProgressInput };
