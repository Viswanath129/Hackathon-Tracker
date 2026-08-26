const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    test('returns valid for valid inputs', () => {
        const result = validateProgressInput({
            teamId: 'proj_123',
            updateText: 'Implemented user authentication',
            deltaPercentage: 25
        });
        expect(result).toEqual({ valid: true });
    });

    test('returns valid for boundary deltaPercentage (-100 and 100)', () => {
        expect(validateProgressInput({ teamId: 't1', updateText: 'reset', deltaPercentage: -100 })).toEqual({ valid: true });
        expect(validateProgressInput({ teamId: 't1', updateText: 'done', deltaPercentage: 100 })).toEqual({ valid: true });
    });

    test('rejects missing or non-object payload', () => {
        expect(validateProgressInput(null).valid).toBe(false);
        expect(validateProgressInput(undefined).valid).toBe(false);
        expect(validateProgressInput('invalid').valid).toBe(false);
    });

    test('rejects missing or empty teamId', () => {
        expect(validateProgressInput({ teamId: '', updateText: 'test', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: '   ', updateText: 'test', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ updateText: 'test', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 123, updateText: 'test', deltaPercentage: 10 }).valid).toBe(false);
    });

    test('rejects missing or empty updateText', () => {
        expect(validateProgressInput({ teamId: 't1', updateText: '', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 't1', updateText: '   ', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 't1', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 't1', updateText: 999, deltaPercentage: 10 }).valid).toBe(false);
    });

    test('rejects boolean deltaPercentage to prevent type coercion', () => {
        expect(validateProgressInput({ teamId: 't1', updateText: 'test', deltaPercentage: true }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 't1', updateText: 'test', deltaPercentage: false }).valid).toBe(false);
    });

    test('rejects non-numeric, null, undefined, or NaN deltaPercentage', () => {
        expect(validateProgressInput({ teamId: 't1', updateText: 'test', deltaPercentage: '25' }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 't1', updateText: 'test', deltaPercentage: null }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 't1', updateText: 'test', deltaPercentage: undefined }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 't1', updateText: 'test', deltaPercentage: NaN }).valid).toBe(false);
    });

    test('rejects out of range deltaPercentage', () => {
        expect(validateProgressInput({ teamId: 't1', updateText: 'test', deltaPercentage: -101 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 't1', updateText: 'test', deltaPercentage: 101 }).valid).toBe(false);
    });
});
