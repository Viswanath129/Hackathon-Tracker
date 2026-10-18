const jwt = require('jsonwebtoken');
const { verifyToken, checkProjectOwnership } = require('../../utils/auth');

describe('auth Utility', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv, JWT_SECRET: 'testsecret123' };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('verifyToken', () => {
        test('successfully verifies a valid JWT with Bearer prefix', () => {
            const token = jwt.sign({ email: 'user@test.com', teamId: 'team123' }, 'testsecret123');
            const decoded = verifyToken(`Bearer ${token}`);
            expect(decoded.email).toBe('user@test.com');
            expect(decoded.teamId).toBe('team123');
        });

        test('throws error if JWT_SECRET is not configured', () => {
            delete process.env.JWT_SECRET;
            expect(() => verifyToken('Bearer token')).toThrow('JWT_SECRET is not configured');
        });

        test('throws error if authHeader is missing or invalid', () => {
            expect(() => verifyToken(null)).toThrow('Authorization header missing or invalid');
            expect(() => verifyToken('')).toThrow('Authorization header missing or invalid');
        });

        test('throws error for invalid token signature', () => {
            const token = jwt.sign({ email: 'user@test.com' }, 'wrongsecret');
            expect(() => verifyToken(`Bearer ${token}`)).toThrow();
        });
    });

    describe('checkProjectOwnership', () => {
        test('returns true for admin users regardless of project ID', () => {
            const adminUser = { role: 'admin', teamId: 'adminTeam' };
            expect(checkProjectOwnership(adminUser, 'otherTeam')).toBe(true);
        });

        test('returns true when user teamId/email strict matches target project ID', () => {
            const user = { teamId: 'team123', email: 'user@test.com' };
            expect(checkProjectOwnership(user, 'team123')).toBe(true);
        });

        test('returns false when user does not own project and is not admin', () => {
            const user = { teamId: 'team123', email: 'user@test.com' };
            expect(checkProjectOwnership(user, 'team456')).toBe(false);
        });

        test('returns false for invalid inputs or non-strict partial matches', () => {
            const user = { teamId: 'team123' };
            expect(checkProjectOwnership(user, 'team12')).toBe(false); // partial match
            expect(checkProjectOwnership(null, 'team123')).toBe(false);
            expect(checkProjectOwnership(user, null)).toBe(false);
        });
    });
});
