const jwt = require('jsonwebtoken');

// Variables referenced inside jest.mock factory must be prefixed with 'mock'
const mockGetUser = jest.fn();
const mockGetAllUsers = jest.fn();
const mockGetProjectById = jest.fn();
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock('../../services/dynamoService', () => ({
    getUser: mockGetUser,
    getAllUsers: mockGetAllUsers,
    getProjectById: mockGetProjectById
}));

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Progress Lambda Handlers', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: 'testsecret', CORS_ORIGIN: 'http://localhost:5173' };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('logUpdate handler', () => {
        it('returns 401 when Authorization header is missing', async () => {
            const event = { headers: {} };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(401);
            expect(JSON.parse(result.body)).toEqual({ message: 'Unauthorized' });
        });

        it('returns 401 when token verification fails', async () => {
            const event = { headers: { Authorization: 'Bearer invalidtoken' } };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(401);
        });

        it('returns 400 when body is missing', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ email: 'user@example.com', role: 'user', teamId: 'proj1' });

            const event = {
                headers: { Authorization: `Bearer ${token}` }
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body)).toEqual({ message: 'Request body is required' });
        });

        it('returns 400 when body is invalid JSON string', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ email: 'user@example.com', role: 'user', teamId: 'proj1' });

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: '{ invalid json '
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body)).toEqual({ message: 'Invalid JSON payload' });
        });

        it('returns 400 when input validation fails (e.g. boolean deltaPercentage)', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ email: 'user@example.com', role: 'user', teamId: 'proj1' });

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    teamId: 'proj1',
                    updateText: 'Valid text',
                    deltaPercentage: true
                })
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).message).toContain('deltaPercentage must be a number');
        });

        it('returns 404 when project is not found', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ email: 'user@example.com', role: 'user', teamId: 'proj1' });
            mockGetProjectById.mockResolvedValue(null);

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    teamId: 'nonexistent',
                    updateText: 'Updated features',
                    deltaPercentage: 15
                })
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(404);
            expect(JSON.parse(result.body)).toEqual({ message: 'Project not found' });
        });

        it('returns 403 when user does not own the project (BOLA check)', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ email: 'user@example.com', role: 'user', teamId: 'proj1' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj2', teamId: 'proj2', email: 'other@example.com' });

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    teamId: 'proj2',
                    updateText: 'Attempting unauthorized update',
                    deltaPercentage: 10
                })
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(403);
            expect(JSON.parse(result.body)).toEqual({ message: 'Forbidden: You do not own this project' });
        });

        it('returns 201 Created on successful progress logging', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ email: 'user@example.com', role: 'user', teamId: 'proj1' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', teamId: 'proj1', email: 'user@example.com' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    teamId: 'proj1',
                    updateText: 'Completed module',
                    deltaPercentage: 25
                })
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(201);
            expect(JSON.parse(result.body)).toEqual({
                message: 'Progress update logged successfully',
                data: { success: true, timestamp: '2026-02-28T00:00:00.000Z' }
            });
        });
    });

    describe('getHistory handler', () => {
        it('returns 401 when Authorization header is missing', async () => {
            const event = { headers: {} };
            const result = await getHistory(event);
            expect(result.statusCode).toBe(401);
        });

        it('returns 404 when project is not found', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ email: 'user@example.com', role: 'user', teamId: 'proj1' });
            mockGetProjectById.mockResolvedValue(null);

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'nonexistent' }
            };
            const result = await getHistory(event);
            expect(result.statusCode).toBe(404);
            expect(JSON.parse(result.body)).toEqual({ message: 'Project not found' });
        });

        it('returns 403 when user does not own the project (BOLA check)', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ email: 'user@example.com', role: 'user', teamId: 'proj1' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj2', teamId: 'proj2', email: 'other@example.com' });

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj2' }
            };
            const result = await getHistory(event);
            expect(result.statusCode).toBe(403);
        });

        it('returns 200 OK with progress history logs', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ email: 'user@example.com', role: 'user', teamId: 'proj1' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', teamId: 'proj1', email: 'user@example.com' });
            const logsMock = [{ update_text: 'Started project', delta_percentage: 10, timestamp: '2026-02-28T00:00:00.000Z' }];
            mockGetProgressLogs.mockResolvedValue(logsMock);

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj1' }
            };
            const result = await getHistory(event);
            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body)).toEqual({
                message: 'Progress history retrieved successfully',
                logs: logsMock
            });
        });
    });
});
