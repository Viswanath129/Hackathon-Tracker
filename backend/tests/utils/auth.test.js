const { checkProjectOwnership } = require('../../utils/auth');

describe('checkProjectOwnership', () => {
    it('should allow access if user role is admin', () => {
        const user = { role: 'admin', teamId: 'admin_team' };
        const project = { teamId: 'other_team' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    it('should allow access if user teamId strictly matches project teamId', () => {
        const user = { teamId: 'team123' };
        const project = { teamId: 'team123' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    it('should allow access if user email matches project owner/email', () => {
        const user = { email: 'dev@test.com' };
        const project = { owner: 'dev@test.com' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    it('should deny access if user identifiers do not match project identifiers', () => {
        const user = { teamId: 'team123', email: 'user1@test.com' };
        const project = { teamId: 'team456', owner: 'user2@test.com' };
        expect(checkProjectOwnership(user, project)).toBe(false);
    });

    it('should deny access if inputs are missing', () => {
        expect(checkProjectOwnership(null, {})).toBe(false);
        expect(checkProjectOwnership({}, null)).toBe(false);
    });

    it('should perform strict matching and prevent substring BOLA vulnerability', () => {
        const user = { teamId: 'team1' };
        const project = { teamId: 'team10' };
        expect(checkProjectOwnership(user, project)).toBe(false);
    });
});
