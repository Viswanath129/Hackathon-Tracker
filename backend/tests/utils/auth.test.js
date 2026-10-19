const { checkProjectOwnership } = require('../../utils/auth');

describe('checkProjectOwnership', () => {
    it('should return false if user or project is missing', () => {
        expect(checkProjectOwnership(null, { team_id: 'team_1' })).toBe(false);
        expect(checkProjectOwnership({ _id: 'team_1' }, null)).toBe(false);
    });

    it('should return true if user role is admin', () => {
        const adminUser = { _id: 'admin_1', role: 'admin' };
        const project = { team_id: 'team_999' };
        expect(checkProjectOwnership(adminUser, project)).toBe(true);
    });

    it('should return true if team_id matches', () => {
        const user = { _id: 'team_10' };
        const project = { team_id: 'team_10' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    it('should return true if email matches', () => {
        const user = { email: 'team@test.com' };
        const project = { email: 'team@test.com' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    it('should return false if identifiers do not match strictly', () => {
        const user = { _id: 'team_1' };
        const project = { team_id: 'team_10' };
        expect(checkProjectOwnership(user, project)).toBe(false);
    });

    it('should prevent BOLA substring bypasses', () => {
        const user = { _id: 'team_1' };
        const project = { team_id: 'team_10' };
        // If substring matching was used, "team_1" would match "team_10". Strict equality prevents this.
        expect(checkProjectOwnership(user, project)).toBe(false);
    });
});
