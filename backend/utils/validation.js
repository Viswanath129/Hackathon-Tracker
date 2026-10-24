const validateProgressInput = (data) => {
    if (!data || typeof data !== 'object') {
        return { isValid: false, error: 'Request body is required' };
    }

    const { teamId, updateText, deltaPercentage } = data;

    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return { isValid: false, error: 'teamId is required and must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return { isValid: false, error: 'updateText is required and must be a non-empty string' };
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
        return { isValid: false, error: 'deltaPercentage must be a number between -100 and 100' };
    }

    return { isValid: true };
};

module.exports = { validateProgressInput };
