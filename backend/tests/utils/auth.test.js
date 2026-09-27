const jwt = require('jsonwebtoken');
const { verifyToken, checkProjectOwnership } = require('../../utils/auth');

describe('auth utils', () => {
    describe('verifyToken', () => {
        const originalEnv = process.env.JWT_SECRET;

        beforeEach(() => {
            process.env.JWT_SECRET = 'test-secret';
        });

        afterEach(() => {
            process.env.JWT_SECRET = originalEnv;
        });

        test('should return decoded token for valid JWT string or Bearer token', () => {
            const token = jwt.sign({ teamId: 'team_1', role: 'user' }, 'test-secret');
            const decoded = verifyToken(`Bearer ${token}`);
            expect(decoded).toBeDefined();
            expect(decoded.teamId).toBe('team_1');
        });

        test('should return null if JWT_SECRET is missing', () => {
            delete process.env.JWT_SECRET;
            const token = jwt.sign({ teamId: 'team_1' }, 'test-secret');
            expect(verifyToken(`Bearer ${token}`)).toBeNull();
        });

        test('should return null for invalid token or missing header', () => {
            expect(verifyToken(null)).toBeNull();
            expect(verifyToken('Bearer invalid-token')).toBeNull();
        });
    });

    describe('checkProjectOwnership', () => {
        test('should allow admin user regardless of project ownership', () => {
            const user = { role: 'admin', teamId: 'other_team' };
            const project = { teamId: 'proj_team' };
            expect(checkProjectOwnership(user, project)).toBe(true);
        });

        test('should allow matching teamId or owner or userEmail', () => {
            const user = { teamId: 'proj_team' };
            const project = { teamId: 'proj_team' };
            expect(checkProjectOwnership(user, project)).toBe(true);

            const user2 = { _id: 'user_123' };
            const project2 = { owner: 'user_123' };
            expect(checkProjectOwnership(user2, project2)).toBe(true);
        });

        test('should reject mismatched user and project', () => {
            const user = { teamId: 'team_a', _id: 'u1' };
            const project = { teamId: 'team_b', owner: 'u2' };
            expect(checkProjectOwnership(user, project)).toBe(false);
        });

        test('should handle missing inputs gracefully', () => {
            expect(checkProjectOwnership(null, {})).toBe(false);
            expect(checkProjectOwnership({}, null)).toBe(false);
        });
    });
});
