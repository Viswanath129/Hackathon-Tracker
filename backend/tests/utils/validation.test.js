const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    test('accepts valid input payload', () => {
        const result = validateProgressInput({
            teamId: 'team123',
            updateText: 'Implemented user auth module',
            deltaPercentage: 25
        });
        expect(result.valid).toBe(true);
    });

    test('accepts boundary deltaPercentage values (-100, 0, 100)', () => {
        expect(validateProgressInput({ teamId: 't1', updateText: 'a', deltaPercentage: -100 }).valid).toBe(true);
        expect(validateProgressInput({ teamId: 't1', updateText: 'a', deltaPercentage: 0 }).valid).toBe(true);
        expect(validateProgressInput({ teamId: 't1', updateText: 'a', deltaPercentage: 100 }).valid).toBe(true);
    });

    test('rejects missing or non-string teamId', () => {
        expect(validateProgressInput({ updateText: 'test', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: '', updateText: 'test', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: '   ', updateText: 'test', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 123, updateText: 'test', deltaPercentage: 10 }).valid).toBe(false);
    });

    test('rejects missing or non-string updateText', () => {
        expect(validateProgressInput({ teamId: 't1', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 't1', updateText: '', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 't1', updateText: '   ', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 't1', updateText: 123, deltaPercentage: 10 }).valid).toBe(false);
    });

    test('rejects boolean deltaPercentage to prevent coercion bypass', () => {
        expect(validateProgressInput({ teamId: 't1', updateText: 'a', deltaPercentage: true }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 't1', updateText: 'a', deltaPercentage: false }).valid).toBe(false);
    });

    test('rejects non-numeric or out of range deltaPercentage', () => {
        expect(validateProgressInput({ teamId: 't1', updateText: 'a', deltaPercentage: 'abc' }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 't1', updateText: 'a', deltaPercentage: 101 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 't1', updateText: 'a', deltaPercentage: -101 }).valid).toBe(false);
    });
});
