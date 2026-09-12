/**
 * Utility to validate progress update input data.
 * Enforces teamId and updateText as non-empty strings, and deltaPercentage
 * as a numeric value between -100 and 100 (rejecting booleans explicitly).
 */
const validateProgressInput = (input) => {
    if (!input || typeof input !== 'object') {
        return { isValid: false, message: 'Invalid or missing request body' };
    }

    const { teamId, updateText, deltaPercentage } = input;

    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return { isValid: false, message: 'teamId must be a non-empty string' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return { isValid: false, message: 'updateText must be a non-empty string' };
    }

    // Explicitly reject booleans to prevent coercion issues like Number(true) === 1
    if (typeof deltaPercentage === 'boolean') {
        return { isValid: false, message: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    if (deltaPercentage === undefined || deltaPercentage === null || deltaPercentage === '') {
        return { isValid: false, message: 'deltaPercentage is required' };
    }

    const numDelta = Number(deltaPercentage);
    if (isNaN(numDelta) || !isFinite(numDelta)) {
        return { isValid: false, message: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    if (numDelta < -100 || numDelta > 100) {
        return { isValid: false, message: 'deltaPercentage must be between -100 and 100' };
    }

    return {
        isValid: true,
        data: {
            teamId: teamId.trim(),
            updateText: updateText.trim(),
            deltaPercentage: numDelta
        }
    };
};

module.exports = {
    validateProgressInput
};
