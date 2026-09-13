const { checkProjectOwnership } = require('../../utils/auth');

describe('checkProjectOwnership Utility', () => {
    test('should return false if user is missing or null', () => {
        expect(checkProjectOwnership(null, 'team1')).toBe(false);
        expect(checkProjectOwnership(undefined, 'team1')).toBe(false);
    });

    test('should return true for admin user regardless of target teamId', () => {
        const adminUser = { role: 'admin', email: 'admin@example.com' };
        expect(checkProjectOwnership(adminUser, 'any-team-id')).toBe(true);
    });

    test('should return true when target matches user teamId, _id, email, or id strictly', () => {
        const user1 = { role: 'team', teamId: 'PROJ#100' };
        expect(checkProjectOwnership(user1, 'PROJ#100')).toBe(true);

        const user2 = { role: 'team', _id: 'user_123' };
        expect(checkProjectOwnership(user2, 'user_123')).toBe(true);

        const user3 = { role: 'team', email: 'team@domain.com' };
        expect(checkProjectOwnership(user3, 'team@domain.com')).toBe(true);
    });

    test('should return false when target does not match user identifiers strictly', () => {
        const user = { role: 'team', teamId: 'team1', _id: 'id1', email: 'user1@test.com' };
        expect(checkProjectOwnership(user, 'team123')).toBe(false);
        expect(checkProjectOwnership(user, 'team')).toBe(false);
        expect(checkProjectOwnership(user, 'user1')).toBe(false);
    });
});
