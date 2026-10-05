const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    it('should return valid true for a valid input payload', () => {
        const input = {
            teamId: 'team123',
            updateText: 'Completed module 1',
            deltaPercentage: 25
        };
        const result = validateProgressInput(input);
        expect(result.valid).toBe(true);
    });

    it('should accept projectId in place of teamId', () => {
        const input = {
            projectId: 'proj456',
            updateText: 'Refactored database schema',
            deltaPercentage: 10
        };
        const result = validateProgressInput(input);
        expect(result.valid).toBe(true);
    });

    it('should fail if teamId / projectId is missing or empty', () => {
        const input = {
            updateText: 'Updated frontend',
            deltaPercentage: 15
        };
        const result = validateProgressInput(input);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('teamId');
    });

    it('should fail if updateText is missing or empty string', () => {
        const input = {
            teamId: 'team123',
            updateText: '   ',
            deltaPercentage: 10
        };
        const result = validateProgressInput(input);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('updateText');
    });

    it('should explicitly reject boolean values for deltaPercentage', () => {
        const input = {
            teamId: 'team123',
            updateText: 'Some text',
            deltaPercentage: true
        };
        const result = validateProgressInput(input);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('deltaPercentage');
    });

    it('should reject deltaPercentage outside [-100, 100]', () => {
        const result1 = validateProgressInput({
            teamId: 'team123',
            updateText: 'Over limit',
            deltaPercentage: 150
        });
        expect(result1.valid).toBe(false);

        const result2 = validateProgressInput({
            teamId: 'team123',
            updateText: 'Under limit',
            deltaPercentage: -105
        });
        expect(result2.valid).toBe(false);
    });

    it('should fail for non-object payloads', () => {
        expect(validateProgressInput(null).valid).toBe(false);
        expect(validateProgressInput('string').valid).toBe(false);
    });
});
