/**
 * Centralized validation for progress update inputs.
 * Enforces 'teamId' (or 'projectId') and 'updateText' as non-empty strings,
 * and 'deltaPercentage' as a numeric value between -100 and 100 (explicitly rejecting booleans).
 */
const validateProgressInput = (data) => {
    if (!data || typeof data !== 'object') {
        return { valid: false, message: 'Request body must be a valid JSON object' };
    }

    const teamId = data.teamId || data.projectId;
    if (typeof teamId !== 'string' || teamId.trim().length === 0) {
        return { valid: false, message: 'teamId (or projectId) must be a non-empty string' };
    }

    if (typeof data.updateText !== 'string' || data.updateText.trim().length === 0) {
        return { valid: false, message: 'updateText must be a non-empty string' };
    }

    const { deltaPercentage } = data;
    if (
        typeof deltaPercentage !== 'number' ||
        typeof deltaPercentage === 'boolean' ||
        isNaN(deltaPercentage) ||
        deltaPercentage < -100 ||
        deltaPercentage > 100
    ) {
        return { valid: false, message: 'deltaPercentage must be a numeric value between -100 and 100' };
    }

    return { valid: true };
};

module.exports = { validateProgressInput };
