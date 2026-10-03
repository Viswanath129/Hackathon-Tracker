const { checkProjectOwnership } = require('../../utils/auth');

describe('checkProjectOwnership', () => {
    test('should allow access if user is admin', () => {
        const user = { _id: 'user_1', role: 'admin' };
        const project = { teamId: 'other_team' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    test('should allow access when user ID matches project teamId', () => {
        const user = { _id: 'team_123', role: 'user' };
        const project = { teamId: 'team_123' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    test('should deny access when user ID does not match project owner', () => {
        const user = { _id: 'team_123', role: 'user' };
        const project = { teamId: 'team_456' };
        expect(checkProjectOwnership(user, project)).toBe(false);
    });

    test('should return false if user or project is null/undefined', () => {
        expect(checkProjectOwnership(null, { teamId: '123' })).toBe(false);
        expect(checkProjectOwnership({ _id: '123' }, null)).toBe(false);
    });
});
