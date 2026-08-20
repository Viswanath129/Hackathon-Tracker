const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    test('should pass for valid input', () => {
        const input = {
            teamId: 'proj_123',
            updateText: 'Completed feature X',
            deltaPercentage: 15
        };
        const result = validateProgressInput(input);
        expect(result.valid).toBe(true);
    });

    test('should pass for negative delta percentage within range', () => {
        const input = {
            teamId: 'proj_123',
            updateText: 'Reverted feature X',
            deltaPercentage: -20
        };
        const result = validateProgressInput(input);
        expect(result.valid).toBe(true);
    });

    test('should fail if teamId is missing or empty', () => {
        expect(validateProgressInput({ updateText: 'test', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: '   ', updateText: 'test', deltaPercentage: 10 }).valid).toBe(false);
    });

    test('should fail if updateText is missing or empty', () => {
        expect(validateProgressInput({ teamId: 'proj_123', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_123', updateText: '', deltaPercentage: 10 }).valid).toBe(false);
    });

    test('should fail if deltaPercentage is a boolean', () => {
        const result = validateProgressInput({
            teamId: 'proj_123',
            updateText: 'Completed feature',
            deltaPercentage: true
        });
        expect(result.valid).toBe(false);
        expect(result.message).toContain('boolean');
    });

    test('should fail if deltaPercentage is not a valid number', () => {
        const result = validateProgressInput({
            teamId: 'proj_123',
            updateText: 'Completed feature',
            deltaPercentage: 'invalid_number'
        });
        expect(result.valid).toBe(false);
    });

    test('should fail if deltaPercentage is outside [-100, 100]', () => {
        expect(validateProgressInput({ teamId: 'p', updateText: 'u', deltaPercentage: 101 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'p', updateText: 'u', deltaPercentage: -101 }).valid).toBe(false);
    });
});
