const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput Utility', () => {
    test('returns valid for correct payload', () => {
        const input = {
            teamId: 'team123',
            updateText: 'Completed module setup',
            deltaPercentage: 25
        };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
    });

    test('accepts string numbers within range', () => {
        const input = {
            teamId: 'team123',
            updateText: 'Progress update',
            deltaPercentage: '50'
        };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(true);
    });

    test('rejects missing or empty teamId', () => {
        expect(validateProgressInput({ updateText: 'Text', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: '  ', updateText: 'Text', deltaPercentage: 10 }).isValid).toBe(false);
    });

    test('rejects missing or empty updateText', () => {
        expect(validateProgressInput({ teamId: 'team1', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'team1', updateText: '', deltaPercentage: 10 }).isValid).toBe(false);
    });

    test('explicitly rejects boolean values for deltaPercentage', () => {
        const resultTrue = validateProgressInput({ teamId: 'team1', updateText: 'Text', deltaPercentage: true });
        expect(resultTrue.isValid).toBe(false);

        const resultFalse = validateProgressInput({ teamId: 'team1', updateText: 'Text', deltaPercentage: false });
        expect(resultFalse.isValid).toBe(false);
    });

    test('rejects deltaPercentage outside range -100 to 100', () => {
        expect(validateProgressInput({ teamId: 'team1', updateText: 'Text', deltaPercentage: 101 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'team1', updateText: 'Text', deltaPercentage: -101 }).isValid).toBe(false);
    });

    test('rejects non-numeric deltaPercentage or null/undefined', () => {
        expect(validateProgressInput({ teamId: 'team1', updateText: 'Text', deltaPercentage: 'abc' }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'team1', updateText: 'Text', deltaPercentage: null }).isValid).toBe(false);
    });
});
