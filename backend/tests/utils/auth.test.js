const { checkProjectOwnership } = require('../../utils/auth');

describe('checkProjectOwnership Utility', () => {
    test('should allow access for admin users regardless of project matching', () => {
        const user = { role: 'admin', _id: 'admin_1' };
        const project = { _id: 'proj_999', teamId: 'team_999' };
        expect(checkProjectOwnership(user, project, 'team_999')).toBe(true);
        expect(checkProjectOwnership(user, null, 'other_team')).toBe(true);
    });

    test('should allow access when user teamId matches requested teamId and project', () => {
        const user = { _id: 'user_1', teamId: 'proj_123', role: 'team' };
        const project = { _id: 'proj_123' };
        expect(checkProjectOwnership(user, project, 'proj_123')).toBe(true);
    });

    test('should deny access (BOLA check) when user teamId does not match requested teamId or project', () => {
        const user = { _id: 'user_1', teamId: 'proj_123', role: 'team' };
        const project = { _id: 'proj_456' };
        expect(checkProjectOwnership(user, project, 'proj_456')).toBe(false);
        expect(checkProjectOwnership(user, { _id: 'proj_123' }, 'proj_456')).toBe(false);
    });

    test('should deny access if user is missing or invalid', () => {
        expect(checkProjectOwnership(null, { _id: 'proj_123' }, 'proj_123')).toBe(false);
        expect(checkProjectOwnership(undefined, { _id: 'proj_123' }, 'proj_123')).toBe(false);
    });
});
