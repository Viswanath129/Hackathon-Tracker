const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    it('should pass for valid input', () => {
        const input = {
            teamId: 'proj123',
            updateText: 'Completed feature X',
            deltaPercentage: 15
        };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should pass for string representation of valid number', () => {
        const input = {
            teamId: 'proj123',
            updateText: 'Completed feature X',
            deltaPercentage: '20'
        };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(true);
    });

    it('should fail if teamId is missing or empty', () => {
        const input = {
            teamId: '',
            updateText: 'Update text',
            deltaPercentage: 10
        };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('teamId is required and must be a non-empty string');
    });

    it('should fail if updateText is missing or empty', () => {
        const input = {
            teamId: 'proj123',
            updateText: '   ',
            deltaPercentage: 10
        };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('updateText is required and must be a non-empty string');
    });

    it('should fail if deltaPercentage is boolean', () => {
        const input = {
            teamId: 'proj123',
            updateText: 'Valid text',
            deltaPercentage: true
        };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('deltaPercentage must be a numeric value between -100 and 100');
    });

    it('should fail if deltaPercentage is out of bounds (< -100 or > 100)', () => {
        const resultUnder = validateProgressInput({
            teamId: 'proj123',
            updateText: 'Valid text',
            deltaPercentage: -150
        });
        expect(resultUnder.isValid).toBe(false);

        const resultOver = validateProgressInput({
            teamId: 'proj123',
            updateText: 'Valid text',
            deltaPercentage: 105
        });
        expect(resultOver.isValid).toBe(false);
    });
});
