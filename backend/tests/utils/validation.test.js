const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    it('should validate correct progress update input', () => {
        const input = {
            teamId: 'proj_123',
            updateText: 'Completed setup phase',
            deltaPercentage: 15
        };
        const result = validateProgressInput(input);
        expect(result.valid).toBe(true);
    });

    it('should support legacy field names (projectId, update_text, delta_percentage)', () => {
        const input = {
            projectId: 'proj_123',
            update_text: 'Completed setup phase',
            delta_percentage: -10
        };
        const result = validateProgressInput(input);
        expect(result.valid).toBe(true);
    });

    it('should reject missing or empty teamId', () => {
        expect(validateProgressInput({ teamId: '', updateText: 'Text', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ updateText: 'Text', deltaPercentage: 10 }).valid).toBe(false);
    });

    it('should reject missing or empty updateText', () => {
        expect(validateProgressInput({ teamId: 'proj_123', updateText: '  ', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_123', deltaPercentage: 10 }).valid).toBe(false);
    });

    it('should reject boolean deltaPercentage', () => {
        const result = validateProgressInput({
            teamId: 'proj_123',
            updateText: 'Valid text',
            deltaPercentage: true
        });
        expect(result.valid).toBe(false);
        expect(result.message).toContain('booleans are not allowed');
    });

    it('should reject deltaPercentage outside range [-100, 100]', () => {
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'Text', deltaPercentage: 105 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'Text', deltaPercentage: -150 }).valid).toBe(false);
    });

    it('should reject null, non-object or missing body', () => {
        expect(validateProgressInput(null).valid).toBe(false);
        expect(validateProgressInput('invalid string').valid).toBe(false);
    });
});
