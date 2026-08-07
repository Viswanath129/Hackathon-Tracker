/**
 * Validates progress update inputs.
 * Enforces:
 * - teamId and updateText as non-empty strings
 * - deltaPercentage as a numeric value between -100 and 100, explicitly rejecting boolean values
 */
const validateProgressInput = (data) => {
    if (!data) {
        return { isValid: false, error: "Request body is missing" };
    }

    const { teamId, updateText, deltaPercentage } = data;

    if (typeof teamId !== "string" || teamId.trim() === "") {
        return { isValid: false, error: "teamId must be a non-empty string" };
    }

    if (typeof updateText !== "string" || updateText.trim() === "") {
        return { isValid: false, error: "updateText must be a non-empty string" };
    }

    if (typeof deltaPercentage === "boolean") {
        return { isValid: false, error: "deltaPercentage cannot be a boolean" };
    }

    const numericDelta = Number(deltaPercentage);
    if (
        typeof deltaPercentage === "symbol" ||
        deltaPercentage === null ||
        deltaPercentage === undefined ||
        isNaN(numericDelta) ||
        (typeof deltaPercentage === "string" && deltaPercentage.trim() === "")
    ) {
        return { isValid: false, error: "deltaPercentage must be a numeric value" };
    }

    if (numericDelta < -100 || numericDelta > 100) {
        return { isValid: false, error: "deltaPercentage must be between -100 and 100" };
    }

    return { isValid: true };
};

module.exports = { validateProgressInput };
