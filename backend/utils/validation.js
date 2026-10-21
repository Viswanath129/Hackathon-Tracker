/**
 * Validates progress update payload.
 * Expected structure:
 * {
 *   teamId: string (non-empty),
 *   updateText: string (non-empty),
 *   deltaPercentage: number (-100 to 100)
 * }
 */
function validateProgressInput(data) {
    if (!data || typeof data !== 'object') {
        return { valid: false, message: 'Invalid payload: expected object' };
    }

    const { teamId, updateText, deltaPercentage } = data;

    if (typeof teamId !== 'string' || teamId.trim() === '') {
        return { valid: false, message: 'teamId must be a non-empty string' };
    }

    if (typeof updateText !== 'string' || updateText.trim() === '') {
        return { valid: false, message: 'updateText must be a non-empty string' };
    }

    if (typeof deltaPercentage === 'boolean' || typeof deltaPercentage !== 'number' || isNaN(deltaPercentage)) {
        return { valid: false, message: 'deltaPercentage must be a valid number' };
    }

    if (deltaPercentage < -100 || deltaPercentage > 100) {
        return { valid: false, message: 'deltaPercentage must be between -100 and 100' };
    }

    return { valid: true };
}

module.exports = {
    validateProgressInput
};
