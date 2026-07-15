/**
 * Validates progress update input
 * @param {string} teamId
 * @param {string} updateText
 * @param {number|string} deltaPercentage
 * @returns {object} { isValid: boolean, error: string|null, delta: number|null }
 */
const validateProgressInput = (teamId, updateText, deltaPercentage) => {
    if (!teamId || typeof teamId !== "string" || teamId.trim() === "") {
        return { isValid: false, error: "teamId must be a non-empty string", delta: null };
    }
    if (!updateText || typeof updateText !== "string" || updateText.trim() === "") {
        return { isValid: false, error: "updateText must be a non-empty string", delta: null };
    }

    const delta = Number(deltaPercentage);
    if (isNaN(delta) || delta < -100 || delta > 100) {
        return { isValid: false, error: "deltaPercentage must be a numeric value between -100 and 100", delta: null };
    }

    return { isValid: true, error: null, delta };
};

module.exports = { validateProgressInput };
