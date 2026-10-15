const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    it('should validate valid progress input', () => {
        const input = {
            teamId: 'proj123',
            updateText: 'Completed backend API integration',
            deltaPercentage: 25
        };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(true);
    });

    it('should reject missing or non-object input', () => {
        expect(validateProgressInput(null).isValid).toBe(false);
        expect(validateProgressInput('invalid').isValid).toBe(false);
    });

    it('should reject empty or missing teamId', () => {
        const result = validateProgressInput({
            teamId: '   ',
            updateText: 'Valid text',
            deltaPercentage: 10
        });
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/teamId/i);
    });

    it('should reject empty or missing updateText', () => {
        const result = validateProgressInput({
            teamId: 'team1',
            updateText: '',
            deltaPercentage: 10
        });
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/updateText/i);
    });

    it('should explicitly reject boolean deltaPercentage', () => {
        const resultTrue = validateProgressInput({
            teamId: 'team1',
            updateText: 'Update text',
            deltaPercentage: true
        });
        expect(resultTrue.isValid).toBe(false);
        expect(resultTrue.error).toMatch(/boolean/i);

        const resultFalse = validateProgressInput({
            teamId: 'team1',
            updateText: 'Update text',
            deltaPercentage: false
        });
        expect(resultFalse.isValid).toBe(false);
        expect(resultFalse.error).toMatch(/boolean/i);
    });

    it('should reject invalid or non-numeric deltaPercentage', () => {
        const result = validateProgressInput({
            teamId: 'team1',
            updateText: 'Update text',
            deltaPercentage: 'abc'
        });
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/number/i);
    });

    it('should reject deltaPercentage out of [-100, 100] range', () => {
        const lowResult = validateProgressInput({
            teamId: 'team1',
            updateText: 'Update text',
            deltaPercentage: -150
        });
        expect(lowResult.isValid).toBe(false);

        const highResult = validateProgressInput({
            teamId: 'team1',
            updateText: 'Update text',
            deltaPercentage: 150
        });
        expect(highResult.isValid).toBe(false);
    });
});
