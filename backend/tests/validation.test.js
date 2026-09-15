const { validateProgressInput } = require('../utils/validation');

describe('validateProgressInput Utility', () => {
    test('returns valid for valid input', () => {
        const result = validateProgressInput({
            teamId: 'proj_123',
            updateText: 'Completed setup',
            deltaPercentage: 25
        });
        expect(result.valid).toBe(true);
    });

    test('rejects missing or non-string teamId', () => {
        expect(validateProgressInput({ updateText: 'test', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: '', updateText: 'test', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 123, updateText: 'test', deltaPercentage: 10 }).valid).toBe(false);
    });

    test('rejects missing or non-string updateText', () => {
        expect(validateProgressInput({ teamId: 'proj_1', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_1', updateText: '   ', deltaPercentage: 10 }).valid).toBe(false);
    });

    test('rejects boolean or out of range deltaPercentage', () => {
        expect(validateProgressInput({ teamId: 'proj_1', updateText: 'test', deltaPercentage: true }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_1', updateText: 'test', deltaPercentage: false }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_1', updateText: 'test', deltaPercentage: 150 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_1', updateText: 'test', deltaPercentage: -150 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_1', updateText: 'test', deltaPercentage: '20' }).valid).toBe(false);
    });
});
