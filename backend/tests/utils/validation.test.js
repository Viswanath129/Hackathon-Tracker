const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput Utility', () => {
    test('returns valid: true for correct payload', () => {
        const input = {
            teamId: 'proj_123',
            updateText: 'Completed backend integration',
            deltaPercentage: 25
        };
        const result = validateProgressInput(input);
        expect(result).toEqual({ valid: true });
    });

    test('returns valid: false when payload is missing or not an object', () => {
        expect(validateProgressInput(null).valid).toBe(false);
        expect(validateProgressInput('string').valid).toBe(false);
    });

    test('returns valid: false for missing or empty teamId', () => {
        expect(validateProgressInput({ updateText: 'test', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: '   ', updateText: 'test', deltaPercentage: 10 }).valid).toBe(false);
    });

    test('returns valid: false for missing or empty updateText', () => {
        expect(validateProgressInput({ teamId: 'p1', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'p1', updateText: '   ', deltaPercentage: 10 }).valid).toBe(false);
    });

    test('returns valid: false when deltaPercentage is a boolean', () => {
        expect(validateProgressInput({ teamId: 'p1', updateText: 'test', deltaPercentage: true }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'p1', updateText: 'test', deltaPercentage: false }).valid).toBe(false);
    });

    test('returns valid: false when deltaPercentage is not a number', () => {
        expect(validateProgressInput({ teamId: 'p1', updateText: 'test', deltaPercentage: '25' }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'p1', updateText: 'test', deltaPercentage: NaN }).valid).toBe(false);
    });

    test('returns valid: false when deltaPercentage is out of bounds', () => {
        expect(validateProgressInput({ teamId: 'p1', updateText: 'test', deltaPercentage: -101 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'p1', updateText: 'test', deltaPercentage: 101 }).valid).toBe(false);
    });

    test('accepts boundary deltaPercentage values (-100 and 100)', () => {
        expect(validateProgressInput({ teamId: 'p1', updateText: 'test', deltaPercentage: -100 })).toEqual({ valid: true });
        expect(validateProgressInput({ teamId: 'p1', updateText: 'test', deltaPercentage: 100 })).toEqual({ valid: true });
    });
});
