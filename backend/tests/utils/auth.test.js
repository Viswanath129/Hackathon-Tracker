const { checkProjectOwnership } = require('../../utils/auth');

describe('checkProjectOwnership Utility', () => {
    it('should return true if user is an admin', () => {
        const user = { role: 'admin', _id: 'admin1' };
        const project = { _id: 'proj1', team_id: 'team2' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    it('should return true if user ID strictly matches project owner ID', () => {
        const user = { _id: 'team123' };
        const project = { team_id: 'team123' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    it('should return false if user ID does not match project owner ID', () => {
        const user = { _id: 'team123' };
        const project = { team_id: 'team999' };
        expect(checkProjectOwnership(user, project)).toBe(false);
    });

    it('should prevent BOLA via strict equality checks rather than substring matching', () => {
        const user = { _id: 'team1' };
        const project = { team_id: 'team10' };
        expect(checkProjectOwnership(user, project)).toBe(false);
    });

    it('should return false if user or project is missing', () => {
        expect(checkProjectOwnership(null, { team_id: '1' })).toBe(false);
        expect(checkProjectOwnership({ _id: '1' }, null)).toBe(false);
    });
});
