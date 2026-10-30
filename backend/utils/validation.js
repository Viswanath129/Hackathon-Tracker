/**
 * Validates progress update payload.
 * Expected input: { teamId, updateText, deltaPercentage }
 * Returns { valid: boolean, error?: string }
 */
const validateProgressInput = (data) => {
    if (!data || typeof data !== 'object') {
        return { valid: false, error: 'Request body must be an object' };
    }

    const { teamId, updateText, deltaPercentage } = data;

    if (typeof teamId !== 'string' || teamId.trim() === '') {
        return { valid: false, error: 'teamId is required and must be a non-empty string' };
    }

    if (typeof updateText !== 'string' || updateText.trim() === '') {
        return { valid: false, error: 'updateText is required and must be a non-empty string' };
    }

    if (typeof deltaPercentage === 'boolean' || typeof deltaPercentage !== 'number' || Number.isNaN(deltaPercentage)) {
        return { valid: false, error: 'deltaPercentage must be a number' };
    }

    if (deltaPercentage < -100 || deltaPercentage > 100) {
        return { valid: false, error: 'deltaPercentage must be between -100 and 100' };
    }

    return { valid: true };
};

module.exports = { validateProgressInput };
