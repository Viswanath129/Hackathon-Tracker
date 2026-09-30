/**
 * Progress input validation utility
 */
function validateProgressInput(data) {
    if (!data) {
        return { isValid: false, error: 'Request body or input is missing' };
    }

    const { teamId, updateText, deltaPercentage } = data;

    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return { isValid: false, error: 'teamId must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return { isValid: false, error: 'updateText must be a non-empty string' };
    }

    if (deltaPercentage === undefined || deltaPercentage === null || typeof deltaPercentage === 'boolean') {
        return { isValid: false, error: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    const numDelta = Number(deltaPercentage);
    if (isNaN(numDelta) || numDelta < -100 || numDelta > 100) {
        return { isValid: false, error: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    return { isValid: true };
}

module.exports = { validateProgressInput };
