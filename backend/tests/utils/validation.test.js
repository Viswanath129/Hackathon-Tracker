const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    test('should validate correct progress input successfully', () => {
        const input = {
            teamId: 'proj_123',
            updateText: 'Completed module implementation',
            deltaPercentage: 25
        };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
    });

    test('should validate zero deltaPercentage', () => {
        const input = {
            teamId: 'proj_123',
            updateText: 'No change status update',
            deltaPercentage: 0
        };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(true);
    });

    test('should validate boundary deltaPercentage values (-100 and 100)', () => {
        const inputMin = { teamId: 'proj_123', updateText: 'Reset', deltaPercentage: -100 };
        const inputMax = { teamId: 'proj_123', updateText: 'Finished', deltaPercentage: 100 };

        expect(validateProgressInput(inputMin).isValid).toBe(true);
        expect(validateProgressInput(inputMax).isValid).toBe(true);
    });

    test('should reject non-object or null input', () => {
        expect(validateProgressInput(null).isValid).toBe(false);
        expect(validateProgressInput('invalid').isValid).toBe(false);
    });

    test('should reject missing or empty teamId', () => {
        expect(validateProgressInput({ updateText: 'test', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: '', updateText: 'test', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: '   ', updateText: 'test', deltaPercentage: 10 }).isValid).toBe(false);
    });

    test('should reject missing or empty updateText', () => {
        expect(validateProgressInput({ teamId: 'proj_1', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_1', updateText: '', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_1', updateText: '   ', deltaPercentage: 10 }).isValid).toBe(false);
    });

    test('should explicitly reject boolean deltaPercentage values', () => {
        const inputTrue = { teamId: 'proj_1', updateText: 'test', deltaPercentage: true };
        const inputFalse = { teamId: 'proj_1', updateText: 'test', deltaPercentage: false };

        const resultTrue = validateProgressInput(inputTrue);
        const resultFalse = validateProgressInput(inputFalse);

        expect(resultTrue.isValid).toBe(false);
        expect(resultTrue.error).toBe('deltaPercentage cannot be a boolean');
        expect(resultFalse.isValid).toBe(false);
        expect(resultFalse.error).toBe('deltaPercentage cannot be a boolean');
    });

    test('should reject non-numeric deltaPercentage values', () => {
        const inputStr = { teamId: 'proj_1', updateText: 'test', deltaPercentage: 'twenty' };
        const inputNaN = { teamId: 'proj_1', updateText: 'test', deltaPercentage: NaN };

        expect(validateProgressInput(inputStr).isValid).toBe(false);
        expect(validateProgressInput(inputNaN).isValid).toBe(false);
    });

    test('should reject deltaPercentage out of range (-100 to 100)', () => {
        const inputLow = { teamId: 'proj_1', updateText: 'test', deltaPercentage: -101 };
        const inputHigh = { teamId: 'proj_1', updateText: 'test', deltaPercentage: 101 };

        expect(validateProgressInput(inputLow).isValid).toBe(false);
        expect(validateProgressInput(inputHigh).isValid).toBe(false);
    });
});
