const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

describe('Validation Utility Tests', () => {
    test('rejects missing or non-object body', () => {
        expect(validateProgressInput(null).valid).toBe(false);
        expect(validateProgressInput(undefined).valid).toBe(false);
        expect(validateProgressInput('string').valid).toBe(false);
    });

    test('rejects missing or empty teamId', () => {
        expect(validateProgressInput({ updateText: 'Log', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: '  ', updateText: 'Log', deltaPercentage: 10 }).valid).toBe(false);
    });

    test('rejects missing or empty updateText', () => {
        expect(validateProgressInput({ teamId: 'proj_1', deltaPercentage: 10 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_1', updateText: '   ', deltaPercentage: 10 }).valid).toBe(false);
    });

    test('rejects boolean deltaPercentage', () => {
        expect(validateProgressInput({ teamId: 'proj_1', updateText: 'Log', deltaPercentage: true }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_1', updateText: 'Log', deltaPercentage: false }).valid).toBe(false);
    });

    test('rejects deltaPercentage out of range or non-numeric', () => {
        expect(validateProgressInput({ teamId: 'proj_1', updateText: 'Log', deltaPercentage: 'abc' }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_1', updateText: 'Log', deltaPercentage: 150 }).valid).toBe(false);
        expect(validateProgressInput({ teamId: 'proj_1', updateText: 'Log', deltaPercentage: -101 }).valid).toBe(false);
    });

    test('accepts valid input', () => {
        const result = validateProgressInput({ teamId: 'proj_123', updateText: 'Fixed bug', deltaPercentage: 25 });
        expect(result.valid).toBe(true);
        expect(result.value).toEqual({ teamId: 'proj_123', updateText: 'Fixed bug', deltaPercentage: 25 });
    });
});

describe('Authorization Utility Tests', () => {
    test('returns false for missing user or project', () => {
        expect(checkProjectOwnership(null, {})).toBe(false);
        expect(checkProjectOwnership({}, null)).toBe(false);
    });

    test('grants access for admin role', () => {
        const user = { role: 'admin' };
        const project = { teamId: 'other_team' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    test('grants access when teamId or ownerId matches', () => {
        const user = { teamId: 'team_1', email: 'user@example.com' };
        const project = { teamId: 'team_1' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    test('grants access when email matches PK', () => {
        const user = { email: 'dev@test.com' };
        const project = { PK: 'USER#dev@test.com' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    test('denies access when identifiers do not match', () => {
        const user = { teamId: 'team_1', email: 'user1@example.com' };
        const project = { teamId: 'team_2', PK: 'USER#user2@example.com' };
        expect(checkProjectOwnership(user, project)).toBe(false);
    });
});
