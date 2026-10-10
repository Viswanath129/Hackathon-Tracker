/**
 * Validates progress update input fields.
 * Required: teamId (non-empty string), updateText (non-empty string), deltaPercentage (number between -100 and 100)
 */
function validateProgressInput(data) {
    if (!data || typeof data !== 'object') {
        return { isValid: false, message: 'Invalid input data' };
    }

    const { teamId, updateText, deltaPercentage } = data;

    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return { isValid: false, message: 'teamId is required and must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return { isValid: false, message: 'updateText is required and must be a non-empty string' };
    }

    if (deltaPercentage === undefined || deltaPercentage === null || typeof deltaPercentage === 'boolean') {
        return { isValid: false, message: 'deltaPercentage is required and must be a number' };
    }

    const numericDelta = Number(deltaPercentage);
    if (isNaN(numericDelta) || typeof deltaPercentage !== 'number') {
        return { isValid: false, message: 'deltaPercentage must be a valid number' };
    }

    if (numericDelta < -100 || numericDelta > 100) {
        return { isValid: false, message: 'deltaPercentage must be between -100 and 100' };
    }

    return { isValid: true };
}

module.exports = {
    validateProgressInput
};
