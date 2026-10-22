const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    test('returns valid result for correct input', () => {
        const input = { teamId: 'proj_123', updateText: 'Completed setup', deltaPercentage: 25 };
        const result = validateProgressInput(input);
        expect(result.valid).toBe(true);
        expect(result.data).toEqual({ teamId: 'proj_123', updateText: 'Completed setup', deltaPercentage: 25 });
    });

    test('rejects missing or empty teamId', () => {
        expect(validateProgressInput({ updateText: 'Test', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: '   ', updateText: 'Test', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 123, updateText: 'Test', deltaPercentage: 10 }).valid).toBe(false);
    });

    test('rejects missing or empty updateText', () => {
        expect(validateProgressInput({ teamId: 'proj_123', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_123', updateText: '', deltaPercentage: 10 }).valid).toBe(false);
    });

    test('rejects boolean deltaPercentage', () => {
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'Test', deltaPercentage: true }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'Test', deltaPercentage: false }).valid).toBe(false);
    });

    test('rejects deltaPercentage outside range -100 to 100', () => {
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'Test', deltaPercentage: 150 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'Test', deltaPercentage: -105 }).valid).toBe(false);
    });

    test('accepts string representations of numbers for deltaPercentage', () => {
        const result = validateProgressInput({ teamId: 'proj_123', updateText: 'Test', deltaPercentage: '50' });
        expect(result.valid).toBe(true);
        expect(result.data.deltaPercentage).toBe(50);
    });
});
