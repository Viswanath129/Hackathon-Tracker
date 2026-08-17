const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    test('returns valid when all inputs are correct', () => {
        const input = {
            teamId: 'proj_123',
            updateText: 'Completed module 1',
            deltaPercentage: 25
        };
        const result = validateProgressInput(input);
        expect(result.valid).toBe(true);
    });

    test('accepts valid string numbers for deltaPercentage', () => {
        const input = {
            teamId: 'proj_123',
            updateText: 'Completed module 1',
            deltaPercentage: '50'
        };
        const result = validateProgressInput(input);
        expect(result.valid).toBe(true);
    });

    test('rejects missing or empty teamId', () => {
        expect(validateProgressInput({ updateText: 'Text', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: '', updateText: 'Text', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: '   ', updateText: 'Text', deltaPercentage: 10 }).valid).toBe(false);
    });

    test('rejects missing or empty updateText', () => {
        expect(validateProgressInput({ teamId: 'p1', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'p1', updateText: '', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'p1', updateText: '   ', deltaPercentage: 10 }).valid).toBe(false);
    });

    test('rejects boolean values for deltaPercentage', () => {
        expect(validateProgressInput({ teamId: 'p1', updateText: 'Text', deltaPercentage: true }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'p1', updateText: 'Text', deltaPercentage: false }).valid).toBe(false);
    });

    test('rejects non-numeric deltaPercentage or values outside [-100, 100]', () => {
        expect(validateProgressInput({ teamId: 'p1', updateText: 'Text', deltaPercentage: 'abc' }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'p1', updateText: 'Text', deltaPercentage: 150 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'p1', updateText: 'Text', deltaPercentage: -105 }).valid).toBe(false);
    });
});
