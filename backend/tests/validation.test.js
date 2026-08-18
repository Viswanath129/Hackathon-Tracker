const { validateProgressInput } = require('../utils/validation');

describe('validateProgressInput', () => {
    test('returns valid for correct input', () => {
        const input = { teamId: 'proj123', updateText: 'Updated auth module', deltaPercentage: 25 };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(true);
        expect(result.data).toEqual({
            teamId: 'proj123',
            updateText: 'Updated auth module',
            deltaPercentage: 25
        });
    });

    test('rejects missing or empty teamId', () => {
        expect(validateProgressInput({ teamId: '', updateText: 'Valid', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ updateText: 'Valid', deltaPercentage: 10 }).isValid).toBe(false);
    });

    test('rejects missing or empty updateText', () => {
        expect(validateProgressInput({ teamId: 'proj1', updateText: '   ', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj1', deltaPercentage: 10 }).isValid).toBe(false);
    });

    test('rejects boolean values for deltaPercentage', () => {
        const result = validateProgressInput({ teamId: 'proj1', updateText: 'Text', deltaPercentage: true });
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('numeric value');
    });

    test('rejects out-of-range deltaPercentage', () => {
        expect(validateProgressInput({ teamId: 'proj1', updateText: 'Text', deltaPercentage: 150 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj1', updateText: 'Text', deltaPercentage: -101 }).isValid).toBe(false);
    });

    test('accepts valid string numbers for deltaPercentage', () => {
        const result = validateProgressInput({ teamId: 'proj1', updateText: 'Text', deltaPercentage: '50' });
        expect(result.isValid).toBe(true);
        expect(result.data.deltaPercentage).toBe(50);
    });
});
