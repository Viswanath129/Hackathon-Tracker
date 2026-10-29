const { checkProjectOwnership } = require('../../utils/auth');

describe('checkProjectOwnership', () => {
    test('returns true for admin user', () => {
        const adminUser = { role: 'admin', email: 'admin@test.com' };
        const project = { teamId: 'otherTeam', _id: 'proj1' };
        expect(checkProjectOwnership(adminUser, project)).toBe(true);
    });

    test('returns true when user _id matches project teamId or ownerId', () => {
        const user = { _id: 'user123', email: 'user@test.com' };
        const project = { teamId: 'user123', _id: 'proj1' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    test('returns true when user email matches project email or PK', () => {
        const user = { email: 'team@test.com' };
        const project = { PK: 'USER#team@test.com', _id: 'proj1' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    test('returns false for unauthorized non-admin user (prevents BOLA)', () => {
        const user = { _id: 'user123', email: 'user@test.com', teamId: 'teamA' };
        const project = { teamId: 'teamB', ownerId: 'user999', email: 'other@test.com' };
        expect(checkProjectOwnership(user, project)).toBe(false);
    });

    test('returns false if user or project is null', () => {
        expect(checkProjectOwnership(null, { teamId: 'teamA' })).toBe(false);
        expect(checkProjectOwnership({ email: 'a@b.com' }, null)).toBe(false);
    });
});
