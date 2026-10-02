const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    test('returns valid when all inputs are valid', () => {
        const input = {
            teamId: 'proj_123',
            updateText: 'Completed feature X',
            deltaPercentage: 15
        };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(true);
    });

    test('rejects missing or non-object input', () => {
        expect(validateProgressInput(null).isValid).toBe(false);
        expect(validateProgressInput(undefined).isValid).toBe(false);
        expect(validateProgressInput('invalid').isValid).toBe(false);
    });

    test('rejects missing or non-string teamId', () => {
        const input = {
            teamId: '  ',
            updateText: 'Completed feature X',
            deltaPercentage: 15
        };
        expect(validateProgressInput(input).isValid).toBe(false);
    });

    test('rejects missing or empty updateText', () => {
        const input = {
            teamId: 'proj_123',
            updateText: '',
            deltaPercentage: 15
        };
        expect(validateProgressInput(input).isValid).toBe(false);
    });

    test('rejects boolean deltaPercentage to prevent type coercion bypass', () => {
        const inputWithTrue = {
            teamId: 'proj_123',
            updateText: 'Completed feature X',
            deltaPercentage: true
        };
        const inputWithFalse = {
            teamId: 'proj_123',
            updateText: 'Completed feature X',
            deltaPercentage: false
        };
        expect(validateProgressInput(inputWithTrue).isValid).toBe(false);
        expect(validateProgressInput(inputWithFalse).isValid).toBe(false);
    });

    test('rejects out-of-range deltaPercentage', () => {
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'test', deltaPercentage: -101 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'test', deltaPercentage: 101 }).isValid).toBe(false);
    });

    test('accepts valid string numbers and edge values (-100 and 100)', () => {
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'test', deltaPercentage: -100 }).isValid).toBe(true);
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'test', deltaPercentage: 100 }).isValid).toBe(true);
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'test', deltaPercentage: '25' }).isValid).toBe(true);
    });
});
