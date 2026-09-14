function validateProgressInput(data) {
    if (!data) {
        return { valid: false, error: 'Missing request body' };
    }
    const { teamId, updateText, deltaPercentage } = data;

    if (typeof teamId !== 'string' || teamId.trim() === '') {
        return { valid: false, error: 'teamId must be a non-empty string' };
    }
    if (typeof updateText !== 'string' || updateText.trim() === '') {
        return { valid: false, error: 'updateText must be a non-empty string' };
    }
    if (typeof deltaPercentage === 'boolean' || typeof deltaPercentage !== 'number' || Number.isNaN(deltaPercentage)) {
        return { valid: false, error: 'deltaPercentage must be a numeric value' };
    }
    if (deltaPercentage < -100 || deltaPercentage > 100) {
        return { valid: false, error: 'deltaPercentage must be between -100 and 100' };
    }

    return { valid: true };
}

module.exports = { validateProgressInput };
