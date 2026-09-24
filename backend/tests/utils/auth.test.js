const { checkProjectOwnership } = require('../../utils/auth');

describe('checkProjectOwnership', () => {
    it('should allow access for admin user', () => {
        const user = { role: 'admin', email: 'admin@test.com' };
        const project = { _id: 'proj_123', teamEmail: 'other@test.com' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    it('should deny access if user or project is null/undefined', () => {
        expect(checkProjectOwnership(null, { _id: 'p1' })).toBe(false);
        expect(checkProjectOwnership({ _id: 'u1' }, null)).toBe(false);
    });

    it('should allow access when user._id matches project.teamId', () => {
        const user = { _id: 'team_abc' };
        const project = { _id: 'proj_1', teamId: 'team_abc' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    it('should allow access when user.email matches project.teamEmail', () => {
        const user = { email: 'team@test.com' };
        const project = { _id: 'proj_1', teamEmail: 'team@test.com' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    it('should allow access when user.loginEmail matches project.PK USER# pattern', () => {
        const user = { loginEmail: 'dev@test.com' };
        const project = { PK: 'USER#dev@test.com', SK: 'PROJ#p1' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    it('should deny access when user and project identifiers do not match', () => {
        const user = { _id: 'team_1', email: 'user1@test.com' };
        const project = { _id: 'proj_99', teamId: 'team_2', teamEmail: 'user2@test.com' };
        expect(checkProjectOwnership(user, project)).toBe(false);
    });

    it('should prevent BOLA substring matching attacks', () => {
        const user = { email: 'adm' };
        const project = { teamEmail: 'admin@domain.com' };
        expect(checkProjectOwnership(user, project)).toBe(false);
    });
});
