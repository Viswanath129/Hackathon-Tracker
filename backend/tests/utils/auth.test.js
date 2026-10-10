const { checkProjectOwnership } = require('../../utils/auth');

describe('Auth Utility - checkProjectOwnership', () => {
    const mockUser = {
        _id: 'user_1',
        email: 'team@example.com',
        role: 'user',
        teamId: 'team_1'
    };

    const mockAdminUser = {
        _id: 'admin_1',
        email: 'admin@example.com',
        role: 'admin'
    };

    const mockProject = {
        _id: 'proj_123',
        team_id: 'user_1',
        email: 'team@example.com',
        PK: 'USER#team@example.com'
    };

    it('should grant access to admin users', () => {
        expect(checkProjectOwnership(mockAdminUser, mockProject)).toBe(true);
    });

    it('should grant access when user _id matches project team_id', () => {
        expect(checkProjectOwnership(mockUser, mockProject)).toBe(true);
    });

    it('should grant access when user email matches project email or PK', () => {
        const projectWithEmailOnly = { _id: 'proj_456', email: 'team@example.com' };
        expect(checkProjectOwnership(mockUser, projectWithEmailOnly)).toBe(true);
    });

    it('should deny access when user identifiers do not match project identifiers (BOLA check)', () => {
        const attackerUser = {
            _id: 'user_2',
            email: 'attacker@example.com',
            role: 'user',
            teamId: 'team_2'
        };

        expect(checkProjectOwnership(attackerUser, mockProject)).toBe(false);
    });

    it('should return false if user or project is null/undefined', () => {
        expect(checkProjectOwnership(null, mockProject)).toBe(false);
        expect(checkProjectOwnership(mockUser, null)).toBe(false);
    });
});
