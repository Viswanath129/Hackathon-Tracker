const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    test('should validate a correct progress input payload', () => {
        const result = validateProgressInput({
            teamId: 'proj_123',
            updateText: 'Completed module 1',
            deltaPercentage: 25
        });
        expect(result.isValid).toBe(true);
    });

    test('should reject non-object payloads', () => {
        expect(validateProgressInput(null).isValid).toBe(false);
        expect(validateProgressInput(undefined).isValid).toBe(false);
        expect(validateProgressInput('string').isValid).toBe(false);
    });

    test('should reject invalid teamId', () => {
        expect(validateProgressInput({ teamId: '', updateText: 'Text', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: '   ', updateText: 'Text', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 123, updateText: 'Text', deltaPercentage: 10 }).isValid).toBe(false);
    });

    test('should reject invalid updateText', () => {
        expect(validateProgressInput({ teamId: 'team1', updateText: '', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'team1', updateText: '   ', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'team1', updateText: null, deltaPercentage: 10 }).isValid).toBe(false);
    });

    test('should explicitly reject boolean values for deltaPercentage', () => {
        expect(validateProgressInput({ teamId: 'team1', updateText: 'Text', deltaPercentage: true }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'team1', updateText: 'Text', deltaPercentage: false }).isValid).toBe(false);
    });

    test('should reject non-numeric or out-of-range deltaPercentage', () => {
        expect(validateProgressInput({ teamId: 'team1', updateText: 'Text', deltaPercentage: 'invalid' }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'team1', updateText: 'Text', deltaPercentage: 101 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'team1', updateText: 'Text', deltaPercentage: -101 }).isValid).toBe(false);
    });

    test('should accept valid edge case deltaPercentages', () => {
        expect(validateProgressInput({ teamId: 'team1', updateText: 'Text', deltaPercentage: -100 }).isValid).toBe(true);
        expect(validateProgressInput({ teamId: 'team1', updateText: 'Text', deltaPercentage: 0 }).isValid).toBe(true);
        expect(validateProgressInput({ teamId: 'team1', updateText: 'Text', deltaPercentage: 100 }).isValid).toBe(true);
        expect(validateProgressInput({ teamId: 'team1', updateText: 'Text', deltaPercentage: '50' }).isValid).toBe(true);
    });
});
