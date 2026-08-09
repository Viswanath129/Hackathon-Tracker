const mockGetUser = jest.fn();
const mockGetAllUsers = jest.fn();
const mockGetProjectById = jest.fn();
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockJwtVerify = jest.fn();

jest.mock('jsonwebtoken', () => ({
    verify: (...args) => mockJwtVerify(...args)
}));

jest.mock('../../services/dynamoService', () => ({
    getUser: (...args) => mockGetUser(...args),
    getAllUsers: (...args) => mockGetAllUsers(...args),
    getProjectById: (...args) => mockGetProjectById(...args)
}));

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args)
}));

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('progress Lambda Handlers', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = {
            ...originalEnv,
            TABLE_NAME: 'HackathonTracker',
            JWT_SECRET: 'testsecret',
            CORS_ORIGIN: 'http://localhost:5173'
        };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('logUpdate Lambda handler', () => {
        it('should return 400 if event body is missing', async () => {
            const event = { body: null };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body)).toEqual({ message: 'Request body is missing' });
        });

        it('should return 400 if event body JSON is invalid', async () => {
            const event = { body: '{invalid-json' };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body)).toEqual({ message: 'Invalid JSON format' });
        });

        it('should return 400 if validation fails (e.g., missing updateText)', async () => {
            const event = {
                body: JSON.stringify({ teamId: 'proj_123', deltaPercentage: 10 }) // Missing updateText
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).message).toContain('updateText');
        });

        it('should return 401 if authorization header is missing', async () => {
            const event = {
                body: JSON.stringify({ teamId: 'proj_123', updateText: 'Hello', deltaPercentage: 10 }),
                headers: {}
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(401);
            expect(JSON.parse(result.body)).toEqual({ message: 'Not authorized, no token' });
        });

        it('should return 500 if JWT_SECRET is unconfigured', async () => {
            process.env.JWT_SECRET = '';
            const event = {
                body: JSON.stringify({ teamId: 'proj_123', updateText: 'Hello', deltaPercentage: 10 }),
                headers: { authorization: 'Bearer dummy-token' }
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(500);
            expect(JSON.parse(result.body)).toEqual({ message: 'Internal Server Error' });
        });

        it('should return 401 if JWT verification fails', async () => {
            mockJwtVerify.mockImplementation(() => {
                throw new Error('invalid token signature');
            });
            const event = {
                body: JSON.stringify({ teamId: 'proj_123', updateText: 'Hello', deltaPercentage: 10 }),
                headers: { authorization: 'Bearer bad-token' }
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(401);
            expect(JSON.parse(result.body)).toEqual({ message: 'Not authorized, token failed' });
        });

        it('should return 401 if user is not found in database', async () => {
            mockJwtVerify.mockReturnValue({ email: 'unknown@example.com' });
            mockGetUser.mockResolvedValue(null);
            mockGetAllUsers.mockResolvedValue([]);

            const event = {
                body: JSON.stringify({ teamId: 'proj_123', updateText: 'Hello', deltaPercentage: 10 }),
                headers: { authorization: 'Bearer valid-token' }
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(401);
            expect(JSON.parse(result.body)).toEqual({ message: 'User not found in cloud' });
        });

        it('should return 404 if project is not found', async () => {
            mockJwtVerify.mockReturnValue({ email: 'user@example.com' });
            mockGetUser.mockResolvedValue({ _id: 'user_123', email: 'user@example.com', role: 'user' });
            mockGetProjectById.mockResolvedValue(null);

            const event = {
                body: JSON.stringify({ teamId: 'proj_nonexistent', updateText: 'Hello', deltaPercentage: 10 }),
                headers: { authorization: 'Bearer valid-token' }
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(404);
            expect(JSON.parse(result.body)).toEqual({ message: 'Project not found' });
        });

        it('should return 403 if non-admin user does not own the project', async () => {
            mockJwtVerify.mockReturnValue({ email: 'user@example.com' });
            mockGetUser.mockResolvedValue({ _id: 'user_123', email: 'user@example.com', role: 'user' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj_123', team_id: 'user_other' });

            const event = {
                body: JSON.stringify({ teamId: 'proj_123', updateText: 'Hello', deltaPercentage: 10 }),
                headers: { authorization: 'Bearer valid-token' }
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(403);
            expect(JSON.parse(result.body)).toEqual({ message: 'Forbidden: Access denied to this project' });
        });

        it('should return 201 on successful progress update creation', async () => {
            mockJwtVerify.mockReturnValue({ email: 'user@example.com' });
            mockGetUser.mockResolvedValue({ _id: 'user_123', email: 'user@example.com', role: 'user' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj_123', team_id: 'user_123' });
            mockLogProgress.mockResolvedValue({ timestamp: '2026-08-09T15:00:00.000Z' });

            const event = {
                body: JSON.stringify({ teamId: 'proj_123', updateText: 'Completed feature', deltaPercentage: 35 }),
                headers: { authorization: 'Bearer valid-token' }
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(201);
            expect(JSON.parse(result.body)).toEqual({
                message: 'Progress update logged successfully',
                timestamp: '2026-08-09T15:00:00.000Z'
            });
            expect(mockLogProgress).toHaveBeenCalledWith('proj_123', 'Completed feature', 35);
        });
    });

    describe('getHistory Lambda handler', () => {
        it('should return 400 if teamId path parameter is missing', async () => {
            const event = { pathParameters: null };
            const result = await getHistory(event);
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body)).toEqual({ message: 'teamId is required' });
        });

        it('should return history logs on success', async () => {
            mockJwtVerify.mockReturnValue({ email: 'user@example.com' });
            mockGetUser.mockResolvedValue({ _id: 'user_123', email: 'user@example.com', role: 'user' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj_123', team_id: 'user_123' });
            const mockLogs = [{ update_text: 'Hello log', delta_percentage: 10 }];
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            const event = {
                pathParameters: { teamId: 'proj_123' },
                headers: { authorization: 'Bearer valid-token' }
            };
            const result = await getHistory(event);
            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body)).toEqual(mockLogs);
        });
    });
});
