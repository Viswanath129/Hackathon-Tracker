const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    test('should pass for valid progress input', () => {
        const input = { teamId: 'proj_123', updateText: 'Completed feature X', deltaPercentage: 25 };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(true);
    });

    test('should reject non-object input', () => {
        expect(validateProgressInput(null).isValid).toBe(false);
        expect(validateProgressInput('invalid').isValid).toBe(false);
    });

    test('should reject missing or empty teamId', () => {
        expect(validateProgressInput({ teamId: '', updateText: 'text', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ updateText: 'text', deltaPercentage: 10 }).isValid).toBe(false);
    });

    test('should reject missing or empty updateText', () => {
        expect(validateProgressInput({ teamId: 'p1', updateText: '   ', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'p1', deltaPercentage: 10 }).isValid).toBe(false);
    });

    test('should reject boolean values for deltaPercentage', () => {
        expect(validateProgressInput({ teamId: 'p1', updateText: 'text', deltaPercentage: true }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'p1', updateText: 'text', deltaPercentage: false }).isValid).toBe(false);
    });

    test('should reject deltaPercentage out of bounds (-100 to 100)', () => {
        expect(validateProgressInput({ teamId: 'p1', updateText: 'text', deltaPercentage: -105 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'p1', updateText: 'text', deltaPercentage: 150 }).isValid).toBe(false);
    });

    test('should pass for deltaPercentage boundary values', () => {
        expect(validateProgressInput({ teamId: 'p1', updateText: 'text', deltaPercentage: -100 }).isValid).toBe(true);
        expect(validateProgressInput({ teamId: 'p1', updateText: 'text', deltaPercentage: 100 }).isValid).toBe(true);
        expect(validateProgressInput({ teamId: 'p1', updateText: 'text', deltaPercentage: 0 }).isValid).toBe(true);
    });
});
