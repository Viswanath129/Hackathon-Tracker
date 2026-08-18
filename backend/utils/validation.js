/**
 * Validation utility for progress update payloads
 */
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

    if (deltaPercentage === undefined || deltaPercentage === null) {
        return { isValid: false, error: 'deltaPercentage is required' };
    }

    if (typeof deltaPercentage === 'boolean') {
        return { isValid: false, error: 'deltaPercentage must be a numeric value' };
    }

    const numDelta = Number(deltaPercentage);
    if (isNaN(numDelta) || typeof deltaPercentage === 'string' && deltaPercentage.trim() === '') {
        return { isValid: false, error: 'deltaPercentage must be a numeric value' };
    }

    if (numDelta < -100 || numDelta > 100) {
        return { isValid: false, error: 'deltaPercentage must be between -100 and 100' };
    }

    return { isValid: true, data: { teamId: teamId.trim(), updateText: updateText.trim(), deltaPercentage: numDelta } };
};

module.exports = { validateProgressInput };
