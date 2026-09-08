/**
 * Validates progress update input parameters.
 * Enforces teamId and updateText as non-empty strings and deltaPercentage as a numeric value between -100 and 100.
 * Explicitly rejects boolean values for deltaPercentage.
 */
const validateProgressInput = (input) => {
    if (!input || typeof input !== 'object') {
        return { isValid: false, message: 'Invalid payload' };
    }

    const { teamId, updateText, deltaPercentage } = input;

    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return { isValid: false, message: 'teamId must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return { isValid: false, message: 'updateText must be a non-empty string' };
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
        return { isValid: false, message: 'deltaPercentage must be a number between -100 and 100' };
    }

    return { isValid: true };
};

module.exports = {
    validateProgressInput
};
