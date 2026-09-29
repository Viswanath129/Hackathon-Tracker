const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    test('returns valid when teamId, updateText, and deltaPercentage are correct', () => {
        const result = validateProgressInput('team123', 'Fixed login bug', 15);
        expect(result.valid).toBe(true);
    });

    test('rejects missing or empty teamId', () => {
        const result = validateProgressInput('', 'Fixed bug', 10);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('teamId');
    });

    test('rejects missing or empty updateText', () => {
        const result = validateProgressInput('team123', '   ', 10);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('updateText');
    });

    test('rejects boolean values for deltaPercentage', () => {
        const result = validateProgressInput('team123', 'Fixed bug', true);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('deltaPercentage');
    });

    test('rejects deltaPercentage below -100', () => {
        const result = validateProgressInput('team123', 'Fixed bug', -150);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('between -100 and 100');
    });

    test('rejects deltaPercentage above 100', () => {
        const result = validateProgressInput('team123', 'Fixed bug', 105);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('between -100 and 100');
    });
});
