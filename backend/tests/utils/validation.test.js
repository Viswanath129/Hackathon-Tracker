const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    test('returns valid for valid input data', () => {
        const input = { teamId: 'team123', updateText: 'Completed feature A', deltaPercentage: 15 };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(true);
    });

    test('accepts string numbers within range for deltaPercentage', () => {
        const input = { teamId: 'team123', updateText: 'Updated docs', deltaPercentage: '25' };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(true);
    });

    test('rejects non-object or null input', () => {
        expect(validateProgressInput(null).isValid).toBe(false);
        expect(validateProgressInput('invalid').isValid).toBe(false);
    });

    test('rejects missing or empty teamId', () => {
        expect(validateProgressInput({ updateText: 'Text', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: '   ', updateText: 'Text', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 123, updateText: 'Text', deltaPercentage: 10 }).isValid).toBe(false);
    });

    test('rejects missing or empty updateText', () => {
        expect(validateProgressInput({ teamId: 'team123', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'team123', updateText: '', deltaPercentage: 10 }).isValid).toBe(false);
    });

    test('rejects boolean values for deltaPercentage', () => {
        expect(validateProgressInput({ teamId: 'team123', updateText: 'Text', deltaPercentage: true }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'team123', updateText: 'Text', deltaPercentage: false }).isValid).toBe(false);
    });

    test('rejects deltaPercentage out of -100 to 100 range', () => {
        expect(validateProgressInput({ teamId: 'team123', updateText: 'Text', deltaPercentage: -105 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'team123', updateText: 'Text', deltaPercentage: 105 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'team123', updateText: 'Text', deltaPercentage: 'abc' }).isValid).toBe(false);
    });
});
