/**
 * Shared progress update validation utility
 */
const validateProgressInput = (data) => {
    if (!data) {
        return { valid: false, message: "Request body is missing" };
    }

    const { teamId, updateText, deltaPercentage } = data;

    if (typeof teamId !== 'string' || teamId.trim() === '') {
        return { valid: false, message: "teamId must be a non-empty string" };
    }

    if (typeof updateText !== 'string' || updateText.trim() === '') {
        return { valid: false, message: "updateText must be a non-empty string" };
    }

    // Explicitly reject boolean values for deltaPercentage
    if (typeof deltaPercentage === 'boolean') {
        return { valid: false, message: "deltaPercentage cannot be a boolean" };
    }

    const numDelta = Number(deltaPercentage);
    if (isNaN(numDelta) || typeof deltaPercentage === 'object' || deltaPercentage === null || deltaPercentage === '') {
        return { valid: false, message: "deltaPercentage must be a numeric value" };
    }

    if (numDelta < -100 || numDelta > 100) {
        return { valid: false, message: "deltaPercentage must be between -100 and 100" };
    }

    return { valid: true };
};

module.exports = { validateProgressInput };
