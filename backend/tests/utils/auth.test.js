const { checkProjectOwnership } = require('../../utils/auth');

describe('checkProjectOwnership', () => {
    test('allows admin user regardless of project ID', () => {
        const user = { role: 'admin' };
        expect(checkProjectOwnership(user, 'team_123')).toBe(true);
    });

    test('allows non-admin user when project ID strictly matches user teamId/id', () => {
        const user = { role: 'team', _id: 'team_123', email: 'team123@example.com' };
        expect(checkProjectOwnership(user, 'team_123')).toBe(true);
        expect(checkProjectOwnership(user, 'team123@example.com')).toBe(true);
    });

    test('rejects non-admin user when project ID is substring of user identifier (preventing BOLA)', () => {
        const user = { role: 'team', _id: '1', email: 'user@example.com' };
        // Target ID '100' contains '1', but strict match must reject it
        expect(checkProjectOwnership(user, '100')).toBe(false);
        expect(checkProjectOwnership(user, 'team_1')).toBe(false);
    });

    test('rejects unauthenticated or null user', () => {
        expect(checkProjectOwnership(null, 'team_123')).toBe(false);
    });
});
