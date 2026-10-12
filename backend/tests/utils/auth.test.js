const { checkProjectOwnership } = require('../../utils/auth');

describe('checkProjectOwnership Utility', () => {
    test('grants access to admin role', () => {
        const user = { role: 'admin' };
        const project = { teamId: 'proj_999' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    test('grants access when user teamId matches project teamId exactly', () => {
        const user = { teamId: 'team_123', role: 'user' };
        const project = { teamId: 'team_123' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    test('grants access when user email matches project email exactly', () => {
        const user = { email: 'team@example.com', role: 'user' };
        const project = { email: 'team@example.com' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    test('denies access on substring mismatch (BOLA protection)', () => {
        const user = { teamId: 'team_1', role: 'user' };
        const project = { teamId: 'team_100' };
        expect(checkProjectOwnership(user, project)).toBe(false);
    });

    test('returns false if user or project is missing', () => {
        expect(checkProjectOwnership(null, { teamId: '123' })).toBe(false);
        expect(checkProjectOwnership({ role: 'user' }, null)).toBe(false);
    });
});
