const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    test('should validate valid progress input correctly', () => {
        const input = {
            teamId: 'proj_123',
            updateText: 'Completed backend integration',
            deltaPercentage: 25
        };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
    });

    test('should accept numeric string for deltaPercentage', () => {
        const input = {
            teamId: 'proj_123',
            updateText: 'Updated UI components',
            deltaPercentage: '15'
        };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(true);
    });

    test('should reject missing or non-object body', () => {
        expect(validateProgressInput(null).isValid).toBe(false);
        expect(validateProgressInput(undefined).isValid).toBe(false);
        expect(validateProgressInput('invalid').isValid).toBe(false);
    });

    test('should reject empty or missing teamId', () => {
        expect(validateProgressInput({ updateText: 'Valid', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: '', updateText: 'Valid', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: '   ', updateText: 'Valid', deltaPercentage: 10 }).isValid).toBe(false);
    });

    test('should reject empty or missing updateText', () => {
        expect(validateProgressInput({ teamId: 'proj_1', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_1', updateText: '', deltaPercentage: 10 }).isValid).toBe(false);
    });

    test('should reject boolean deltaPercentage', () => {
        const result = validateProgressInput({ teamId: 'proj_1', updateText: 'Test', deltaPercentage: true });
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('numeric value');
    });

    test('should reject non-numeric deltaPercentage', () => {
        const result = validateProgressInput({ teamId: 'proj_1', updateText: 'Test', deltaPercentage: 'abc' });
        expect(result.isValid).toBe(false);
    });

    test('should reject deltaPercentage out of range [-100, 100]', () => {
        expect(validateProgressInput({ teamId: 'proj_1', updateText: 'Test', deltaPercentage: 150 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_1', updateText: 'Test', deltaPercentage: -105 }).isValid).toBe(false);
    });
});
