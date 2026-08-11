/**
 * Shared progress update input validation utility.
 * Enforces:
 * - teamId and updateText as non-empty strings.
 * - deltaPercentage as a numeric value between -100 and 100.
 * - Explicitly rejects boolean values for deltaPercentage.
 */
function validateProgressInput(input) {
    if (!input) {
        return { isValid: false, message: "Required input is missing" };
    }

    const { teamId, updateText, deltaPercentage } = input;

    if (typeof teamId !== "string" || teamId.trim() === "") {
        return { isValid: false, message: "teamId is required and must be a non-empty string" };
    }

    if (typeof updateText !== "string" || updateText.trim() === "") {
        return { isValid: false, message: "updateText is required and must be a non-empty string" };
    }

    if (typeof deltaPercentage === "boolean") {
        return { isValid: false, message: "deltaPercentage cannot be a boolean" };
    }

    if (deltaPercentage === undefined || deltaPercentage === null) {
        return { isValid: false, message: "deltaPercentage is required" };
    }

    const num = Number(deltaPercentage);
    if (isNaN(num) || num < -100 || num > 100) {
        return { isValid: false, message: "deltaPercentage must be a numeric value between -100 and 100" };
    }

    return { isValid: true };
}

module.exports = { validateProgressInput };
