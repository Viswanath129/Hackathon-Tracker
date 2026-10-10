const { validateProgressInput } = require('../../utils/validation');

describe('Validation Utility - validateProgressInput', () => {
    it('should pass validation for valid input', () => {
        const result = validateProgressInput({
            teamId: 'proj_123',
            updateText: 'Completed backend integration',
            deltaPercentage: 15
        });
        expect(result.isValid).toBe(true);
    });

    it('should reject missing or non-string teamId', () => {
        expect(validateProgressInput({ updateText: 'Test', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: '   ', updateText: 'Test', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 123, updateText: 'Test', deltaPercentage: 10 }).isValid).toBe(false);
    });

    it('should reject missing or non-string updateText', () => {
        expect(validateProgressInput({ teamId: 'proj_123', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_123', updateText: '', deltaPercentage: 10 }).isValid).toBe(false);
    });

    it('should reject boolean values for deltaPercentage', () => {
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'Test', deltaPercentage: true }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'Test', deltaPercentage: false }).isValid).toBe(false);
    });

    it('should reject deltaPercentage outside [-100, 100]', () => {
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'Test', deltaPercentage: -150 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'Test', deltaPercentage: 101 }).isValid).toBe(false);
    });

    it('should accept 0 as a valid deltaPercentage', () => {
        const result = validateProgressInput({
            teamId: 'proj_123',
            updateText: 'No percentage change',
            deltaPercentage: 0
        });
        expect(result.isValid).toBe(true);
    });
});
