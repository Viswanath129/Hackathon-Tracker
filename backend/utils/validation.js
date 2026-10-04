/**
 * Centralized validation utility for progress updates.
 * Shared across Express controllers and Lambda handlers.
 */
function validateProgressInput(teamIdOrObject, updateTextArg, deltaPercentageArg) {
    let teamId, updateText, deltaPercentage;

    if (typeof teamIdOrObject === 'object' && teamIdOrObject !== null) {
        teamId = teamIdOrObject.teamId;
        updateText = teamIdOrObject.updateText;
        deltaPercentage = teamIdOrObject.deltaPercentage;
    } else {
        teamId = teamIdOrObject;
        updateText = updateTextArg;
        deltaPercentage = deltaPercentageArg;
    }

    if (typeof teamId !== 'string' || teamId.trim() === '') {
        return { valid: false, error: 'teamId must be a non-empty string' };
    }

    if (typeof updateText !== 'string' || updateText.trim() === '') {
        return { valid: false, error: 'updateText must be a non-empty string' };
    }

    if (typeof deltaPercentage === 'boolean') {
        return { valid: false, error: 'deltaPercentage cannot be a boolean' };
    }

    if (deltaPercentage === undefined || deltaPercentage === null || deltaPercentage === '') {
        return { valid: false, error: 'deltaPercentage must be a numeric value' };
    }

    const numericDelta = Number(deltaPercentage);
    if (Number.isNaN(numericDelta) || typeof deltaPercentage === 'symbol') {
        return { valid: false, error: 'deltaPercentage must be a numeric value' };
    }

    if (numericDelta < -100 || numericDelta > 100) {
        return { valid: false, error: 'deltaPercentage must be between -100 and 100' };
    }

    return { valid: true };
}

module.exports = { validateProgressInput };
