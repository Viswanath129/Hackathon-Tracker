const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput Utility', () => {
    test('should validate correct progress input successfully', () => {
        const input = {
            teamId: 'proj_123',
            updateText: 'Completed module API integration',
            deltaPercentage: 25
        };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(true);
    });

    test('should reject missing or non-object body', () => {
        expect(validateProgressInput(null).isValid).toBe(false);
        expect(validateProgressInput(undefined).isValid).toBe(false);
        expect(validateProgressInput('invalid').isValid).toBe(false);
    });

    test('should reject missing or empty teamId', () => {
        const input = { teamId: '', updateText: 'Log', deltaPercentage: 10 };
        expect(validateProgressInput(input).isValid).toBe(false);
        expect(validateProgressInput({ ...input, teamId: 123 }).isValid).toBe(false);
    });

    test('should reject missing or empty updateText', () => {
        const input = { teamId: 'proj_123', updateText: '   ', deltaPercentage: 10 };
        expect(validateProgressInput(input).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_123', deltaPercentage: 10 }).isValid).toBe(false);
    });

    test('should reject non-numeric, boolean, or out-of-bounds deltaPercentage', () => {
        expect(validateProgressInput({ teamId: 'p1', updateText: 'log', deltaPercentage: true }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'p1', updateText: 'log', deltaPercentage: false }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'p1', updateText: 'log', deltaPercentage: '20' }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'p1', updateText: 'log', deltaPercentage: 150 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'p1', updateText: 'log', deltaPercentage: -101 }).isValid).toBe(false);
    });
});
