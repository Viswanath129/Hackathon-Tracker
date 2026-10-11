const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput Utility', () => {
    it('should validate correct progress input successfully', () => {
        const input = {
            teamId: 'proj123',
            updateText: 'Completed feature X',
            deltaPercentage: 25
        };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(true);
    });

    it('should fail if teamId is missing or empty', () => {
        const input1 = { teamId: '', updateText: 'Valid', deltaPercentage: 10 };
        const input2 = { updateText: 'Valid', deltaPercentage: 10 };
        expect(validateProgressInput(input1).isValid).toBe(false);
        expect(validateProgressInput(input2).isValid).toBe(false);
    });

    it('should fail if updateText is missing or empty', () => {
        const input = { teamId: 'proj123', updateText: '   ', deltaPercentage: 10 };
        expect(validateProgressInput(input).isValid).toBe(false);
    });

    it('should explicitly reject boolean deltaPercentage', () => {
        const input = { teamId: 'proj123', updateText: 'Valid', deltaPercentage: true };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('cannot be a boolean');
    });

    it('should reject non-numeric deltaPercentage or NaN', () => {
        const input = { teamId: 'proj123', updateText: 'Valid', deltaPercentage: 'abc' };
        expect(validateProgressInput(input).isValid).toBe(false);
    });

    it('should reject deltaPercentage outside range [-100, 100]', () => {
        const inputLow = { teamId: 'proj123', updateText: 'Valid', deltaPercentage: -150 };
        const inputHigh = { teamId: 'proj123', updateText: 'Valid', deltaPercentage: 150 };
        expect(validateProgressInput(inputLow).isValid).toBe(false);
        expect(validateProgressInput(inputHigh).isValid).toBe(false);
    });
});
