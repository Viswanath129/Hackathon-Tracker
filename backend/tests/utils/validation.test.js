const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    test('should return valid for correct inputs', () => {
        const result = validateProgressInput('proj_123', 'Fixed issue in API', 25);
        expect(result.isValid).toBe(true);
    });

    test('should return invalid if teamId is missing or empty', () => {
        expect(validateProgressInput('', 'Text', 10).isValid).toBe(false);
        expect(validateProgressInput(null, 'Text', 10).isValid).toBe(false);
        expect(validateProgressInput('   ', 'Text', 10).isValid).toBe(false);
    });

    test('should return invalid if updateText is missing or empty', () => {
        expect(validateProgressInput('proj_123', '', 10).isValid).toBe(false);
        expect(validateProgressInput('proj_123', null, 10).isValid).toBe(false);
        expect(validateProgressInput('proj_123', '   ', 10).isValid).toBe(false);
    });

    test('should reject boolean deltaPercentage', () => {
        expect(validateProgressInput('proj_123', 'Text', true).isValid).toBe(false);
        expect(validateProgressInput('proj_123', 'Text', false).isValid).toBe(false);
    });

    test('should reject deltaPercentage outside range -100 to 100', () => {
        expect(validateProgressInput('proj_123', 'Text', 101).isValid).toBe(false);
        expect(validateProgressInput('proj_123', 'Text', -101).isValid).toBe(false);
        expect(validateProgressInput('proj_123', 'Text', NaN).isValid).toBe(false);
    });

    test('should accept boundary values for deltaPercentage (-100 and 100)', () => {
        expect(validateProgressInput('proj_123', 'Text', -100).isValid).toBe(true);
        expect(validateProgressInput('proj_123', 'Text', 100).isValid).toBe(true);
    });
});
