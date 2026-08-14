const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput Utility', () => {
    test('should validate valid progress input successfully', () => {
        const input = {
            teamId: 'proj_123',
            updateText: 'Completed feature X',
            deltaPercentage: 25
        };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
    });

    test('should accept numeric string for deltaPercentage within range', () => {
        const input = {
            teamId: 'proj_123',
            updateText: 'Completed feature X',
            deltaPercentage: '50'
        };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(true);
    });

    test('should explicitly reject boolean values for deltaPercentage', () => {
        const inputTrue = {
            teamId: 'proj_123',
            updateText: 'Completed feature X',
            deltaPercentage: true
        };
        const resultTrue = validateProgressInput(inputTrue);
        expect(resultTrue.isValid).toBe(false);
        expect(resultTrue.error).toMatch(/boolean/i);

        const inputFalse = {
            teamId: 'proj_123',
            updateText: 'Completed feature X',
            deltaPercentage: false
        };
        const resultFalse = validateProgressInput(inputFalse);
        expect(resultFalse.isValid).toBe(false);
    });

    test('should reject empty or missing teamId', () => {
        const result1 = validateProgressInput({ teamId: '', updateText: 'Text', deltaPercentage: 10 });
        expect(result1.isValid).toBe(false);

        const result2 = validateProgressInput({ updateText: 'Text', deltaPercentage: 10 });
        expect(result2.isValid).toBe(false);
    });

    test('should reject empty or missing updateText', () => {
        const result1 = validateProgressInput({ teamId: 'proj_123', updateText: '   ', deltaPercentage: 10 });
        expect(result1.isValid).toBe(false);

        const result2 = validateProgressInput({ teamId: 'proj_123', deltaPercentage: 10 });
        expect(result2.isValid).toBe(false);
    });

    test('should reject deltaPercentage out of -100 to 100 range', () => {
        const resultLow = validateProgressInput({ teamId: 'proj_123', updateText: 'Text', deltaPercentage: -101 });
        expect(resultLow.isValid).toBe(false);

        const resultHigh = validateProgressInput({ teamId: 'proj_123', updateText: 'Text', deltaPercentage: 101 });
        expect(resultHigh.isValid).toBe(false);
    });

    test('should reject non-numeric deltaPercentage', () => {
        const result = validateProgressInput({ teamId: 'proj_123', updateText: 'Text', deltaPercentage: 'abc' });
        expect(result.isValid).toBe(false);
    });

    test('should reject null or non-object input', () => {
        expect(validateProgressInput(null).isValid).toBe(false);
        expect(validateProgressInput(undefined).isValid).toBe(false);
        expect(validateProgressInput('string').isValid).toBe(false);
    });
});
