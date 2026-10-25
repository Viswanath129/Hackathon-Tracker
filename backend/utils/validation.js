/**
 * Utility function to validate progress update input fields.
 * Validates teamId, updateText, and deltaPercentage.
 */
function validateProgressInput(data) {
    if (!data) {
        return { isValid: false, error: 'Input data is required' };
    }

    const { teamId, updateText, deltaPercentage } = data;

    if (typeof teamId !== 'string' || teamId.trim() === '') {
        return { isValid: false, error: 'teamId must be a non-empty string' };
    }

    if (typeof updateText !== 'string' || updateText.trim() === '') {
        return { isValid: false, error: 'updateText must be a non-empty string' };
    }

    if (typeof deltaPercentage === 'boolean') {
        return { isValid: false, error: 'deltaPercentage cannot be a boolean' };
    }

    if (typeof deltaPercentage !== 'number' || Number.isNaN(deltaPercentage)) {
        return { isValid: false, error: 'deltaPercentage must be a numeric value' };
    }

    if (deltaPercentage < -100 || deltaPercentage > 100) {
        return { isValid: false, error: 'deltaPercentage must be between -100 and 100' };
    }

    return { isValid: true };
}

module.exports = { validateProgressInput };
