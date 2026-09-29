const { checkProjectOwnership } = require('../../utils/auth');

describe('checkProjectOwnership', () => {
    test('returns false when user is missing', () => {
        expect(checkProjectOwnership(null, { teamId: 'team1' })).toBe(false);
    });

    test('grants access automatically to admin user', () => {
        const adminUser = { role: 'admin', email: 'admin@example.com' };
        expect(checkProjectOwnership(adminUser, { teamId: 'team1' })).toBe(true);
    });

    test('returns true when user.teamId matches project.teamId strictly', () => {
        const user = { role: 'user', teamId: 'team1', email: 'user@example.com' };
        const project = { teamId: 'team1' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    test('returns false when user teamId does not match project teamId', () => {
        const user = { role: 'user', teamId: 'team1', email: 'user@example.com' };
        const project = { teamId: 'team2' };
        expect(checkProjectOwnership(user, project)).toBe(false);
    });
});
