/**
 * Validates input parameters for progress updates.
 *
 * @param {Object} input - Progress update payload.
 * @param {string} input.teamId - Team/Project ID.
 * @param {string} input.updateText - Description of progress update.
 * @param {number} input.deltaPercentage - Percentage change (-100 to 100).
 * @returns {Object} Validation result { isValid: boolean, error?: string }
 */
function validateProgressInput(input) {
    if (!input || typeof input !== 'object') {
        return { isValid: false, error: 'Invalid request body' };
    }

    const { teamId, updateText, deltaPercentage } = input;

    if (teamId === undefined || teamId === null || typeof teamId !== 'string' || teamId.trim() === '') {
        return { isValid: false, error: 'teamId must be a non-empty string' };
    }

    if (updateText === undefined || updateText === null || typeof updateText !== 'string' || updateText.trim() === '') {
        return { isValid: false, error: 'updateText must be a non-empty string' };
    }

    if (typeof deltaPercentage === 'boolean') {
        return { isValid: false, error: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    const numericDelta = Number(deltaPercentage);
    if (
        deltaPercentage === undefined ||
        deltaPercentage === null ||
        deltaPercentage === '' ||
        Number.isNaN(numericDelta)
    ) {
        return { isValid: false, error: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    if (numericDelta < -100 || numericDelta > 100) {
        return { isValid: false, error: 'deltaPercentage must be between -100 and 100' };
    }

    return { isValid: true };
}

module.exports = { validateProgressInput };
