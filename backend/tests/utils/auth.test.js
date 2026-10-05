const { checkProjectOwnership } = require('../../utils/auth');

describe('checkProjectOwnership', () => {
    it('should grant access to admin user', () => {
        const user = { role: 'admin', email: 'admin@example.com' };
        const project = { _id: 'proj123', teamId: 'team999' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    it('should grant access when user _id matches project teamId or _id', () => {
        const user = { _id: 'team123', email: 'user@example.com' };
        const project = { teamId: 'team123' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    it('should grant access when user email matches project userEmail or email', () => {
        const user = { email: 'dev@example.com' };
        const project = { email: 'dev@example.com' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    it('should grant access when loginEmail matches member email in project.members array', () => {
        const user = { loginEmail: 'member@example.com' };
        const project = { members: [{ email: 'member@example.com' }] };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    it('should deny access when user identifiers do not strictly match project identifiers', () => {
        const user = { _id: 'user1', email: 'user1@example.com' };
        const project = { teamId: 'user2', email: 'user2@example.com' };
        expect(checkProjectOwnership(user, project)).toBe(false);
    });

    it('should return false if user or project is missing', () => {
        expect(checkProjectOwnership(null, {})).toBe(false);
        expect(checkProjectOwnership({}, null)).toBe(false);
    });
});
