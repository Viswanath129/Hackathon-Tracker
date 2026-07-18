/**
 * Validation utility for progress update inputs
 * Centralized and shared between Lambda handlers and Express controllers to ensure consistency.
 */
function validateProgressInput(data) {
    if (!data) {
        return {
            isValid: false,
            error: "Request body is missing"
        };
    }

    const { teamId, updateText, deltaPercentage } = data;
    const errors = [];

    if (typeof teamId !== "string" || teamId.trim() === "") {
        errors.push("teamId must be a non-empty string");
    }

    if (typeof updateText !== "string" || updateText.trim() === "") {
        errors.push("updateText must be a non-empty string");
    }

    if (typeof deltaPercentage !== "number" || isNaN(deltaPercentage) || deltaPercentage < -100 || deltaPercentage > 100) {
        errors.push("deltaPercentage must be a numeric value between -100 and 100");
    }

    if (errors.length > 0) {
        return {
            isValid: false,
            error: errors.join(", ")
        };
    }

    return {
        isValid: true
    };
}

module.exports = { validateProgressInput };
