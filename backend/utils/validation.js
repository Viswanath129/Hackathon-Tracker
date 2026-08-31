/**
 * Validates input parameters for progress updates.
 *
 * @param {Object} data
 * @param {string} [data.teamId]
 * @param {string} [data.projectId]
 * @param {string} data.updateText
 * @param {number} data.deltaPercentage
 * @returns {{ valid: boolean, error?: string, projectId?: string, updateText?: string, deltaPercentage?: number }}
 */
function validateProgressInput(data) {
    if (!data || typeof data !== 'object') {
        return { valid: false, error: 'Request body must be a valid JSON object' };
    }

    const projectId = data.teamId || data.projectId;

    if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
        return { valid: false, error: 'teamId (or projectId) is required and must be a non-empty string' };
    }

    if (!data.updateText || typeof data.updateText !== 'string' || data.updateText.trim() === '') {
        return { valid: false, error: 'updateText is required and must be a non-empty string' };
    }

    if (typeof data.deltaPercentage === 'boolean') {
        return { valid: false, error: 'deltaPercentage must be a numeric value, not a boolean' };
    }

    const numDelta = Number(data.deltaPercentage);

    if (data.deltaPercentage === null || data.deltaPercentage === undefined || Number.isNaN(numDelta) || typeof data.deltaPercentage !== 'number') {
        return { valid: false, error: 'deltaPercentage must be a valid number' };
    }

    if (numDelta < -100 || numDelta > 100) {
        return { valid: false, error: 'deltaPercentage must be between -100 and 100' };
    }

    return {
        valid: true,
        projectId: projectId.trim(),
        updateText: data.updateText.trim(),
        deltaPercentage: numDelta
    };
}

module.exports = {
    validateProgressInput
};
