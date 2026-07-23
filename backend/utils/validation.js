/**
 * Shared progress validation helper
 * Enforces teamId and updateText are non-empty strings and deltaPercentage is a number between -100 and 100.
 * Explicitly rejects boolean values for deltaPercentage to avoid coercion bypass.
 */
function validateProgressInput(teamId, updateText, deltaPercentage) {
    // Check if first arg is an object (allowing destructuring or object arg)
    let tId = teamId;
    let uText = updateText;
    let dPct = deltaPercentage;
    if (typeof teamId === "object" && teamId !== null && updateText === undefined && deltaPercentage === undefined) {
        tId = teamId.teamId;
        uText = teamId.updateText;
        dPct = teamId.deltaPercentage;
    }

    if (typeof tId !== "string" || tId.trim() === "") {
        return { valid: false, message: "teamId must be a non-empty string" };
    }

    if (typeof uText !== "string" || uText.trim() === "") {
        return { valid: false, message: "updateText must be a non-empty string" };
    }

    if (typeof dPct === "boolean") {
        return { valid: false, message: "deltaPercentage must be a numeric value" };
    }

    const num = Number(dPct);
    if (isNaN(num) || typeof dPct === "object" || dPct === null || dPct === "") {
        return { valid: false, message: "deltaPercentage must be a numeric value" };
    }

    if (num < -100 || num > 100) {
        return { valid: false, message: "deltaPercentage must be between -100 and 100" };
    }

    return {
        valid: true,
        data: {
            teamId: tId,
            updateText: uText,
            deltaPercentage: num
        }
    };
}

module.exports = { validateProgressInput };
