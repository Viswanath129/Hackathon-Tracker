const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    test('validates correct progress input', () => {
        const input = {
            teamId: 'proj123',
            updateText: 'Completed feature X',
            deltaPercentage: 25
        };
        const result = validateProgressInput(input);
        expect(result.isValid || result.valid).toBe(true);
    });

    test('rejects missing or empty teamId', () => {
        expect((validateProgressInput({ updateText: 'test', deltaPercentage: 10 })).isValid).toBe(false);
        expect((validateProgressInput({ teamId: '', updateText: 'test', deltaPercentage: 10 })).isValid).toBe(false);
        expect((validateProgressInput({ teamId: '   ', updateText: 'test', deltaPercentage: 10 })).isValid).toBe(false);
    });

    test('rejects missing or empty updateText', () => {
        expect((validateProgressInput({ teamId: 'p1', deltaPercentage: 10 })).isValid).toBe(false);
        expect((validateProgressInput({ teamId: 'p1', updateText: '  ', deltaPercentage: 10 })).isValid).toBe(false);
    });

    test('rejects boolean values for deltaPercentage', () => {
        const result = validateProgressInput({
            teamId: 'p1',
            updateText: 'test',
            deltaPercentage: true
        });
        expect(result.isValid || result.valid).toBe(false);
    });

    test('rejects deltaPercentage out of range or NaN', () => {
        expect((validateProgressInput({ teamId: 'p1', updateText: 'test', deltaPercentage: 150 })).isValid).toBe(false);
        expect((validateProgressInput({ teamId: 'p1', updateText: 'test', deltaPercentage: -101 })).isValid).toBe(false);
        expect((validateProgressInput({ teamId: 'p1', updateText: 'test', deltaPercentage: 'not-a-number' })).isValid).toBe(false);
    });

    test('rejects null or non-object body', () => {
        expect((validateProgressInput(null)).isValid).toBe(false);
        expect((validateProgressInput('invalid')).isValid).toBe(false);
    });
});
