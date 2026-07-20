/**
 * Progress tracking input validation utility
 */
const validateProgressInput = (data) => {
    const errors = [];

    if (!data) {
        return { isValid: false, errors: ['Request body is missing'] };
    }

    const { teamId, updateText, deltaPercentage } = data;

    if (typeof teamId !== 'string' || teamId.trim() === '') {
        errors.push("teamId must be a non-empty string");
    }

    if (typeof updateText !== 'string' || updateText.trim() === '') {
        errors.push("updateText must be a non-empty string");
    }

    if (typeof deltaPercentage !== 'number' || isNaN(deltaPercentage) || deltaPercentage < -100 || deltaPercentage > 100) {
        errors.push("deltaPercentage must be a numeric value between -100 and 100");
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

module.exports = { validateProgressInput };
