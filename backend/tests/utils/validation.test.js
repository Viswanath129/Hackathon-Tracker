const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput Utility', () => {
    test('returns valid true for valid input', () => {
        const input = { teamId: 'proj_123', updateText: 'Completed setup', deltaPercentage: 25 };
        const result = validateProgressInput(input);
        expect(result.valid).toBe(true);
    });

    test('rejects missing or empty teamId', () => {
        expect(validateProgressInput({ teamId: '', updateText: 'text', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ updateText: 'text', deltaPercentage: 10 }).valid).toBe(false);
    });

    test('rejects missing or empty updateText', () => {
        expect(validateProgressInput({ teamId: 'proj_123', updateText: '   ', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_123', deltaPercentage: 10 }).valid).toBe(false);
    });

    test('rejects boolean deltaPercentage', () => {
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'text', deltaPercentage: true }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'text', deltaPercentage: false }).valid).toBe(false);
    });

    test('rejects out of range deltaPercentage', () => {
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'text', deltaPercentage: -101 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'text', deltaPercentage: 101 }).valid).toBe(false);
    });

    test('accepts string numbers within range', () => {
        const result = validateProgressInput({ teamId: 'proj_123', updateText: 'text', deltaPercentage: '50' });
        expect(result.valid).toBe(true);
    });
});
