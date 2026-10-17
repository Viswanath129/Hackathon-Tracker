const { validateProgressInput } = require('../../utils/validation');
const { checkProjectOwnership } = require('../../utils/auth');

describe('Validation Utility - validateProgressInput', () => {
    test('validates valid input correctly', () => {
        const input = { teamId: 'team123', updateText: 'Completed module 1', deltaPercentage: 25 };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(true);
    });

    test('accepts string numeric values for deltaPercentage', () => {
        const input = { teamId: 'team123', updateText: 'Completed module 1', deltaPercentage: '15' };
        const result = validateProgressInput(input);
        expect(result.isValid).toBe(true);
    });

    test('accepts deltaPercentage edge values -100 and 100', () => {
        expect(validateProgressInput({ teamId: 't1', updateText: 'text', deltaPercentage: -100 }).isValid).toBe(true);
        expect(validateProgressInput({ teamId: 't1', updateText: 'text', deltaPercentage: 100 }).isValid).toBe(true);
    });

    test('rejects boolean deltaPercentage', () => {
        const result = validateProgressInput({ teamId: 'team123', updateText: 'Task', deltaPercentage: true });
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('numeric');
    });

    test('rejects deltaPercentage out of range', () => {
        expect(validateProgressInput({ teamId: 't1', updateText: 'text', deltaPercentage: 150 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 't1', updateText: 'text', deltaPercentage: -101 }).isValid).toBe(false);
    });

    test('rejects empty or non-string teamId', () => {
        expect(validateProgressInput({ teamId: '', updateText: 'text', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 123, updateText: 'text', deltaPercentage: 10 }).isValid).toBe(false);
    });

    test('rejects empty or non-string updateText', () => {
        expect(validateProgressInput({ teamId: 't1', updateText: '  ', deltaPercentage: 10 }).isValid).toBe(false);
        expect(validateProgressInput({ teamId: 't1', updateText: null, deltaPercentage: 10 }).isValid).toBe(false);
    });

    test('rejects null or non-object input', () => {
        expect(validateProgressInput(null).isValid).toBe(false);
        expect(validateProgressInput('invalid').isValid).toBe(false);
    });
});

describe('Auth Utility - checkProjectOwnership', () => {
    test('grants access to admin users', () => {
        const user = { role: 'admin', teamId: 'team1' };
        const project = { teamId: 'team2' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    test('grants access when user teamId matches project teamId strictly', () => {
        const user = { role: 'user', teamId: 'team123' };
        const project = { teamId: 'team123' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    test('denies access on substring mismatch (preventing BOLA)', () => {
        const user = { role: 'user', teamId: 'team1' };
        const project = { teamId: 'team10' };
        expect(checkProjectOwnership(user, project)).toBe(false);
    });

    test('returns false if user or project is null', () => {
        expect(checkProjectOwnership(null, { teamId: 'team1' })).toBe(false);
        expect(checkProjectOwnership({ teamId: 'team1' }, null)).toBe(false);
    });
});
