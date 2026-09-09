const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    test('returns valid for correct input', () => {
        const input = { teamId: 'proj_123', updateText: 'Completed task', deltaPercentage: 25 };
        const result = validateProgressInput(input);
        expect(result.valid).toBe(true);
    });

    test('accepts projectId as alias for teamId', () => {
        const input = { projectId: 'proj_123', updateText: 'Completed task', deltaPercentage: 0 };
        const result = validateProgressInput(input);
        expect(result.valid).toBe(true);
    });

    test('rejects missing teamId', () => {
        const input = { updateText: 'Task', deltaPercentage: 10 };
        const result = validateProgressInput(input);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('teamId');
    });

    test('rejects empty updateText', () => {
        const input = { teamId: 'proj_123', updateText: '   ', deltaPercentage: 10 };
        const result = validateProgressInput(input);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('updateText');
    });

    test('rejects boolean deltaPercentage to prevent type coercion bypass', () => {
        const input = { teamId: 'proj_123', updateText: 'Task', deltaPercentage: true };
        const result = validateProgressInput(input);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('numeric value');
    });

    test('rejects deltaPercentage out of range (>100)', () => {
        const input = { teamId: 'proj_123', updateText: 'Task', deltaPercentage: 150 };
        const result = validateProgressInput(input);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('between -100 and 100');
    });

    test('rejects deltaPercentage out of range (<-100)', () => {
        const input = { teamId: 'proj_123', updateText: 'Task', deltaPercentage: -105 };
        const result = validateProgressInput(input);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('between -100 and 100');
    });
});
