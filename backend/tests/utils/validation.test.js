const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    test('should validate correct progress input', () => {
        const input = {
            teamId: 'proj_123',
            updateText: 'Implemented search feature',
            deltaPercentage: 25
        };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(true);
    });

    test('should fail if input is missing or not an object', () => {
        expect(validateProgressInput(null).isValid).toBe(false);
        expect(validateProgressInput('invalid').isValid).toBe(false);
    });

    test('should fail if teamId is missing or empty', () => {
        expect(validateProgressInput({ updateText: 'test', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: '   ', updateText: 'test', deltaPercentage: 10 }).isValid).toBe(false);
    });

    test('should fail if updateText is missing or empty', () => {
        expect(validateProgressInput({ teamId: 'proj_1', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_1', updateText: '  ', deltaPercentage: 10 }).isValid).toBe(false);
    });

    test('should fail if deltaPercentage is boolean', () => {
        const result = validateProgressInput({
            teamId: 'proj_1',
            updateText: 'test',
            deltaPercentage: true
        });
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('cannot be a boolean');
    });

    test('should fail if deltaPercentage is not a number', () => {
        expect(validateProgressInput({ teamId: 'proj_1', updateText: 'test', deltaPercentage: '20' }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_1', updateText: 'test', deltaPercentage: NaN }).isValid).toBe(false);
    });

    test('should fail if deltaPercentage is out of bounds (-100 to 100)', () => {
        expect(validateProgressInput({ teamId: 'proj_1', updateText: 'test', deltaPercentage: 101 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_1', updateText: 'test', deltaPercentage: -101 }).isValid).toBe(false);
    });
});
