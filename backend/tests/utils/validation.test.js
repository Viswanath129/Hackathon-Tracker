const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    it('should validate a correct progress input', () => {
        const result = validateProgressInput({
            teamId: 'proj_123',
            updateText: 'Completed module 1',
            deltaPercentage: 25
        });
        expect(result.isValid).toBe(true);
    });

    it('should accept valid edge values for deltaPercentage (-100, 0, 100)', () => {
        expect(validateProgressInput({ teamId: 't1', updateText: 'a', deltaPercentage: -100 }).isValid).toBe(true);
        expect(validateProgressInput({ teamId: 't1', updateText: 'a', deltaPercentage: 0 }).isValid).toBe(true);
        expect(validateProgressInput({ teamId: 't1', updateText: 'a', deltaPercentage: 100 }).isValid).toBe(true);
    });

    it('should reject invalid or missing teamId', () => {
        expect(validateProgressInput({ teamId: '', updateText: 'text', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 123, updateText: 'text', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ updateText: 'text', deltaPercentage: 10 }).isValid).toBe(false);
    });

    it('should reject invalid or missing updateText', () => {
        expect(validateProgressInput({ teamId: 't1', updateText: '', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 't1', updateText: '   ', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 't1', deltaPercentage: 10 }).isValid).toBe(false);
    });

    it('should explicitly reject boolean values for deltaPercentage', () => {
        expect(validateProgressInput({ teamId: 't1', updateText: 'text', deltaPercentage: true }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 't1', updateText: 'text', deltaPercentage: false }).isValid).toBe(false);
    });

    it('should reject non-numeric deltaPercentage values', () => {
        expect(validateProgressInput({ teamId: 't1', updateText: 'text', deltaPercentage: '25' }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 't1', updateText: 'text', deltaPercentage: NaN }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 't1', updateText: 'text', deltaPercentage: null }).isValid).toBe(false);
    });

    it('should reject deltaPercentage outside [-100, 100]', () => {
        expect(validateProgressInput({ teamId: 't1', updateText: 'text', deltaPercentage: -101 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 't1', updateText: 'text', deltaPercentage: 101 }).isValid).toBe(false);
    });

    it('should reject non-object inputs', () => {
        expect(validateProgressInput(null).isValid).toBe(false);
        expect(validateProgressInput('string').isValid).toBe(false);
    });
});
