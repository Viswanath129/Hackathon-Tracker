const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    test('valid input returns { valid: true }', () => {
        const result = validateProgressInput('team123', 'Completed step 1', 25);
        expect(result.valid).toBe(true);
    });

    test('valid input with negative delta returns { valid: true }', () => {
        const result = validateProgressInput('team123', 'Reverted feature', -10);
        expect(result.valid).toBe(true);
    });

    test('missing teamId fails validation', () => {
        const result = validateProgressInput('', 'Text', 10);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('teamId');
    });

    test('non-string teamId fails validation', () => {
        const result = validateProgressInput(123, 'Text', 10);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('teamId');
    });

    test('missing updateText fails validation', () => {
        const result = validateProgressInput('team123', '   ', 10);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('updateText');
    });

    test('boolean deltaPercentage explicitly rejected', () => {
        const result = validateProgressInput('team123', 'Text', true);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('boolean');
    });

    test('out of range deltaPercentage (> 100) fails validation', () => {
        const result = validateProgressInput('team123', 'Text', 150);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('between -100 and 100');
    });

    test('out of range deltaPercentage (< -100) fails validation', () => {
        const result = validateProgressInput('team123', 'Text', -150);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('between -100 and 100');
    });

    test('non-numeric string deltaPercentage fails validation', () => {
        const result = validateProgressInput('team123', 'Text', 'abc');
        expect(result.valid).toBe(false);
        expect(result.message).toContain('numeric');
    });
});
