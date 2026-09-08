const { validateProgressInput } = require('../utils/validation');

describe('validateProgressInput', () => {
    test('should validate correct progress update input', () => {
        const input = {
            teamId: 'proj_123',
            updateText: 'Completed frontend layout',
            deltaPercentage: 25
        };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(true);
    });

    test('should reject non-object payloads', () => {
        expect(validateProgressInput(null).isValid).toBe(false);
        expect(validateProgressInput(undefined).isValid).toBe(false);
        expect(validateProgressInput('string payload').isValid).toBe(false);
    });

    test('should reject missing or empty teamId', () => {
        const input = { teamId: '', updateText: 'Valid text', deltaPercentage: 10 };
        expect(validateProgressInput(input).isValid).toBe(false);
        expect(validateProgressInput({ updateText: 'Valid', deltaPercentage: 10 }).isValid).toBe(false);
    });

    test('should reject missing or empty updateText', () => {
        const input = { teamId: 'proj_123', updateText: '   ', deltaPercentage: 10 };
        expect(validateProgressInput(input).isValid).toBe(false);
    });

    test('should reject boolean deltaPercentage (preventing type coercion)', () => {
        const input = { teamId: 'proj_123', updateText: 'Valid text', deltaPercentage: true };
        expect(validateProgressInput(input).isValid).toBe(false);
        const inputFalse = { teamId: 'proj_123', updateText: 'Valid text', deltaPercentage: false };
        expect(validateProgressInput(inputFalse).isValid).toBe(false);
    });

    test('should reject deltaPercentage out of range (-100 to 100)', () => {
        expect(validateProgressInput({ teamId: 'proj', updateText: 'Text', deltaPercentage: -101 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj', updateText: 'Text', deltaPercentage: 101 }).isValid).toBe(false);
    });

    test('should accept deltaPercentage bounds (-100 and 100)', () => {
        expect(validateProgressInput({ teamId: 'proj', updateText: 'Text', deltaPercentage: -100 }).isValid).toBe(true);
        expect(validateProgressInput({ teamId: 'proj', updateText: 'Text', deltaPercentage: 100 }).isValid).toBe(true);
    });
});
