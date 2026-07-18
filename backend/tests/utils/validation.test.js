const { validateProgressInput } = require("../../utils/validation");

describe("validateProgressInput", () => {
    it("should validate correctly when all fields are valid", () => {
        const input = {
            teamId: "team-123",
            updateText: "Completed backend integration",
            deltaPercentage: 25
        };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(true);
    });

    it("should fail validation when teamId is empty or not a string", () => {
        expect(validateProgressInput({ teamId: "", updateText: "Valid", deltaPercentage: 1 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 123, updateText: "Valid", deltaPercentage: 1 }).isValid).toBe(false);
        expect(validateProgressInput({ updateText: "Valid", deltaPercentage: 1 }).isValid).toBe(false);
    });

    it("should fail validation when updateText is empty or not a string", () => {
        expect(validateProgressInput({ teamId: "team-1", updateText: "", deltaPercentage: 1 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: "team-1", updateText: {}, deltaPercentage: 1 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: "team-1", deltaPercentage: 1 }).isValid).toBe(false);
    });

    it("should fail validation when deltaPercentage is out of range [-100, 100]", () => {
        expect(validateProgressInput({ teamId: "team-1", updateText: "Valid", deltaPercentage: -101 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: "team-1", updateText: "Valid", deltaPercentage: 101 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: "team-1", updateText: "Valid", deltaPercentage: "20" }).isValid).toBe(false);
    });

    it("should handle null/undefined input safely", () => {
        expect(validateProgressInput(null).isValid).toBe(false);
        expect(validateProgressInput(undefined).isValid).toBe(false);
    });
});
