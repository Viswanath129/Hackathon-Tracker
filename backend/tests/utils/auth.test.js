const { checkProjectOwnership } = require('../../utils/auth');

describe('checkProjectOwnership', () => {
    test('returns false when user or project is missing', () => {
        expect(checkProjectOwnership(null, {})).toBe(false);
        expect(checkProjectOwnership({}, null)).toBe(false);
    });

    test('returns true when user has admin role', () => {
        const adminUser = { role: 'admin', email: 'admin@test.com' };
        const project = { teamId: 'other_team', email: 'other@test.com' };
        expect(checkProjectOwnership(adminUser, project)).toBe(true);
    });

    test('returns true when user identifiers strictly match project owner identifiers', () => {
        const user = { _id: 'proj_123', email: 'team@test.com' };
        const project = { _id: 'proj_123', email: 'team@test.com' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    test('returns false when user identifiers do not match project owner identifiers (prevents BOLA)', () => {
        const user = { _id: 'proj_123', email: 'team1@test.com' };
        const project = { _id: 'proj_456', email: 'team2@test.com' };
        expect(checkProjectOwnership(user, project)).toBe(false);
    });

    test('does not allow partial / substring matches (prevents BOLA)', () => {
        const user = { email: 'team' };
        const project = { email: 'team123@test.com' };
        expect(checkProjectOwnership(user, project)).toBe(false);
    });
});
