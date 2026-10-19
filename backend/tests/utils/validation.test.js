const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    it('should pass for valid inputs', () => {
        const input = {
            teamId: 'proj_123',
            updateText: 'Completed milestone 1',
            deltaPercentage: 25
        };
        const result = validateProgressInput(input);
        expect(result.valid).toBe(true);
    });

    it('should reject missing or non-object input', () => {
        expect(validateProgressInput(null).valid).toBe(false);
        expect(validateProgressInput(undefined).valid).toBe(false);
        expect(validateProgressInput('invalid').valid).toBe(false);
    });

    it('should reject missing or empty teamId', () => {
        expect(validateProgressInput({ updateText: 'Text', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: '', updateText: 'Text', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: '   ', updateText: 'Text', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 123, updateText: 'Text', deltaPercentage: 10 }).valid).toBe(false);
    });

    it('should reject missing or empty updateText', () => {
        expect(validateProgressInput({ teamId: 'proj_1', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_1', updateText: '', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_1', updateText: '   ', deltaPercentage: 10 }).valid).toBe(false);
    });

    it('should reject boolean deltaPercentage', () => {
        expect(validateProgressInput({ teamId: 'proj_1', updateText: 'Text', deltaPercentage: true }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_1', updateText: 'Text', deltaPercentage: false }).valid).toBe(false);
    });

    it('should reject non-numeric or out-of-range deltaPercentage', () => {
        expect(validateProgressInput({ teamId: 'proj_1', updateText: 'Text', deltaPercentage: 'abc' }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_1', updateText: 'Text', deltaPercentage: 150 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_1', updateText: 'Text', deltaPercentage: -101 }).valid).toBe(false);
    });

    it('should accept edge values for deltaPercentage (-100 and 100)', () => {
        expect(validateProgressInput({ teamId: 'proj_1', updateText: 'Text', deltaPercentage: -100 }).valid).toBe(true);
        expect(validateProgressInput({ teamId: 'proj_1', updateText: 'Text', deltaPercentage: 100 }).valid).toBe(true);
        expect(validateProgressInput({ teamId: 'proj_1', updateText: 'Text', deltaPercentage: 0 }).valid).toBe(true);
    });
});
