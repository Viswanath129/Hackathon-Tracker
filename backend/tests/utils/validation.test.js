const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    test('validates correct progress input', () => {
        const input = {
            teamId: 'proj_123',
            updateText: 'Completed feature X',
            deltaPercentage: 25
        };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
    });

    test('accepts valid edge percentage values (-100 and 100)', () => {
        expect(validateProgressInput({ teamId: 't1', updateText: 'a', deltaPercentage: -100 }).isValid).toBe(true);
        expect(validateProgressInput({ teamId: 't1', updateText: 'a', deltaPercentage: 100 }).isValid).toBe(true);
        expect(validateProgressInput({ teamId: 't1', updateText: 'a', deltaPercentage: 0 }).isValid).toBe(true);
    });

    test('rejects missing or non-object body', () => {
        expect(validateProgressInput(null).isValid).toBe(false);
        expect(validateProgressInput(undefined).isValid).toBe(false);
        expect(validateProgressInput('string').isValid).toBe(false);
    });

    test('rejects missing or empty teamId', () => {
        expect(validateProgressInput({ teamId: '', updateText: 'a', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: '   ', updateText: 'a', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ updateText: 'a', deltaPercentage: 10 }).isValid).toBe(false);
    });

    test('rejects missing or empty updateText', () => {
        expect(validateProgressInput({ teamId: 't1', updateText: '', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 't1', updateText: '  ', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 't1', deltaPercentage: 10 }).isValid).toBe(false);
    });

    test('rejects boolean deltaPercentage', () => {
        expect(validateProgressInput({ teamId: 't1', updateText: 'a', deltaPercentage: true }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 't1', updateText: 'a', deltaPercentage: false }).isValid).toBe(false);
    });

    test('rejects deltaPercentage outside range [-100, 100]', () => {
        expect(validateProgressInput({ teamId: 't1', updateText: 'a', deltaPercentage: 101 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 't1', updateText: 'a', deltaPercentage: -101 }).isValid).toBe(false);
    });

    test('rejects NaN deltaPercentage', () => {
        expect(validateProgressInput({ teamId: 't1', updateText: 'a', deltaPercentage: 'invalid' }).isValid).toBe(false);
    });
});
