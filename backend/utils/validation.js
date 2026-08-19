/**
 * Utility for validating progress update inputs
 */

const validateProgressInput = (data) => {
    if (!data || typeof data !== 'object') {
        return { isValid: false, message: 'Request body must be a valid JSON object' };
    }

    const { teamId, updateText, deltaPercentage } = data;

    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return { isValid: false, message: 'teamId is required and must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return { isValid: false, message: 'updateText is required and must be a non-empty string' };
    }

    if (deltaPercentage === undefined || deltaPercentage === null || typeof deltaPercentage === 'boolean') {
        return { isValid: false, message: 'deltaPercentage is required and must be a number between -100 and 100' };
    }

    const numericDelta = Number(deltaPercentage);
    if (isNaN(numericDelta) || numericDelta < -100 || numericDelta > 100) {
        return { isValid: false, message: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    return {
        isValid: true,
        data: {
            teamId: teamId.trim(),
            updateText: updateText.trim(),
            deltaPercentage: numericDelta
        }
    };
};

module.exports = {
    validateProgressInput
};
