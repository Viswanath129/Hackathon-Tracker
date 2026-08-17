/**
 * Validates progress update input fields.
 *
 * @param {Object} input
 * @param {string} input.teamId - Project / Team ID
 * @param {string} input.updateText - Progress update details
 * @param {number|string} input.deltaPercentage - Numeric delta (-100 to 100)
 * @returns {{ valid: boolean, message?: string }}
 */
function validateProgressInput({ teamId, updateText, deltaPercentage } = {}) {
    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return { valid: false, message: 'teamId is required and must be a non-empty string.' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return { valid: false, message: 'updateText is required and must be a non-empty string.' };
    }

    // Explicitly reject booleans (e.g., true/false) which can bypass Number coercion
    if (typeof deltaPercentage === 'boolean' || deltaPercentage === null || deltaPercentage === undefined) {
        return { valid: false, message: 'deltaPercentage must be a valid number between -100 and 100.' };
    }

    const numDelta = Number(deltaPercentage);
    if (Number.isNaN(numDelta) || numDelta < -100 || numDelta > 100) {
        return { valid: false, message: 'deltaPercentage must be a valid number between -100 and 100.' };
    }

    return { valid: true };
}

module.exports = {
    validateProgressInput
};
