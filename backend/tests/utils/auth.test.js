const mockGetProjectById = jest.fn();

jest.mock('../../services/dynamoService', () => ({
    getProjectById: (...args) => mockGetProjectById(...args)
}));

const jwt = require('jsonwebtoken');
const { verifyToken, checkProjectOwnership } = require('../../utils/auth');

describe('auth utils', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
        mockGetProjectById.mockReset();
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('verifyToken', () => {
        it('should throw error if JWT_SECRET is not configured', () => {
            delete process.env.JWT_SECRET;
            expect(() => verifyToken('Bearer token123')).toThrow('JWT_SECRET is not configured');
        });

        it('should verify valid token', () => {
            process.env.JWT_SECRET = 'secret123';
            const payload = { email: 'test@example.com', role: 'user' };
            const token = jwt.sign(payload, 'secret123');
            const decoded = verifyToken(`Bearer ${token}`);
            expect(decoded.email).toBe('test@example.com');
        });

        it('should throw error if token is missing', () => {
            process.env.JWT_SECRET = 'secret123';
            expect(() => verifyToken('')).toThrow('No token provided');
        });
    });

    describe('checkProjectOwnership', () => {
        it('should return true for admin user', async () => {
            const result = await checkProjectOwnership({ role: 'admin' }, 'proj_123');
            expect(result).toBe(true);
        });

        it('should return true if team_id matches project team_id', async () => {
            mockGetProjectById.mockResolvedValue({ _id: 'proj_123', team_id: 'team_abc' });
            const result = await checkProjectOwnership({ _id: 'team_abc', role: 'user' }, 'proj_123');
            expect(result).toBe(true);
        });

        it('should return false if user does not own project', async () => {
            mockGetProjectById.mockResolvedValue({ _id: 'proj_123', team_id: 'team_other' });
            const result = await checkProjectOwnership({ _id: 'team_abc', role: 'user' }, 'proj_123');
            expect(result).toBe(false);
        });

        it('should return false if project is not found', async () => {
            mockGetProjectById.mockResolvedValue(null);
            const result = await checkProjectOwnership({ _id: 'team_abc', role: 'user' }, 'proj_123');
            expect(result).toBe(false);
        });
    });
});
