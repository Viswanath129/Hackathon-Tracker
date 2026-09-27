/**
 * Validates progress update input fields.
 *
 * @param {string} teamId
 * @param {string} updateText
 * @param {number} deltaPercentage
 * @returns {{ isValid: boolean, message?: string }}
 */
function validateProgressInput(teamId, updateText, deltaPercentage) {
    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return { isValid: false, message: 'teamId is required and must be a non-empty string.' };
    }

    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return { isValid: false, message: 'updateText is required and must be a non-empty string.' };
    }

    if (typeof deltaPercentage === 'boolean') {
        return { isValid: false, message: 'deltaPercentage must be a numeric value between -100 and 100.' };
    }

    const numDelta = Number(deltaPercentage);
    if (deltaPercentage === null || deltaPercentage === undefined || isNaN(numDelta) || numDelta < -100 || numDelta > 100) {
        return { isValid: false, message: 'deltaPercentage must be a numeric value between -100 and 100.' };
    }

    return { isValid: true };
}

module.exports = {
    validateProgressInput
};
