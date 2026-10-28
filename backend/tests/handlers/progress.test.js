const jwt = require('jsonwebtoken');

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

describe('Lambda Progress Handlers', () => {
    const JWT_SECRET = 'test_secret_key';

    beforeAll(() => {
        process.env.JWT_SECRET = JWT_SECRET;
        process.env.CORS_ORIGIN = 'http://localhost:5173';
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('logUpdate returns 401 when authorization header is missing', async () => {
        const event = { headers: {} };
        const response = await logUpdate(event);
        expect(response.statusCode).toBe(401);
        expect(JSON.parse(response.body).message).toMatch(/Not authorized/);
    });

    test('logUpdate returns 400 on invalid JSON payload', async () => {
        const token = jwt.sign({ email: 'team@test.com' }, JWT_SECRET);
        mockGetUser.mockResolvedValueOnce({ email: 'team@test.com', teamId: 'proj_100' });

        const event = {
            headers: { Authorization: `Bearer ${token}` },
            body: '{ invalid json'
        };

        const response = await logUpdate(event);
        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body).message).toBe('Invalid JSON payload');
    });

    test('logUpdate returns 404 when project does not exist', async () => {
        const token = jwt.sign({ email: 'team@test.com' }, JWT_SECRET);
        mockGetUser.mockResolvedValueOnce({ email: 'team@test.com', teamId: 'proj_100' });
        mockGetProjectById.mockResolvedValueOnce(null);

        const event = {
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ teamId: 'proj_100', updateText: 'Log text', deltaPercentage: 10 })
        };

        const response = await logUpdate(event);
        expect(response.statusCode).toBe(404);
        expect(JSON.parse(response.body).message).toBe('Project not found');
    });

    test('logUpdate returns 403 when user is BOLA unauthorized', async () => {
        const token = jwt.sign({ email: 'team@test.com' }, JWT_SECRET);
        mockGetUser.mockResolvedValueOnce({ email: 'team@test.com', teamId: 'team_a' });
        mockGetProjectById.mockResolvedValueOnce({ _id: 'team_b', teamId: 'team_b' });

        const event = {
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ teamId: 'team_b', updateText: 'Log text', deltaPercentage: 10 })
        };

        const response = await logUpdate(event);
        expect(response.statusCode).toBe(403);
        expect(JSON.parse(response.body).message).toMatch(/Forbidden/);
    });

    test('logUpdate logs progress and returns 201 Created on success', async () => {
        const token = jwt.sign({ email: 'team@test.com' }, JWT_SECRET);
        mockGetUser.mockResolvedValueOnce({ email: 'team@test.com', teamId: 'proj_100' });
        mockGetProjectById.mockResolvedValueOnce({ _id: 'proj_100', teamId: 'proj_100' });
        mockLogProgress.mockResolvedValueOnce({ success: true, timestamp: '2026-02-28T00:00:00Z' });

        const event = {
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ teamId: 'proj_100', updateText: 'Sprint completed', deltaPercentage: 15 })
        };

        const response = await logUpdate(event);
        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.body);
        expect(body.message).toBe('Progress update logged successfully');
        expect(body.data).toEqual({ success: true, timestamp: '2026-02-28T00:00:00Z' });
    });

    test('getHistory returns 200 OK with logs list on success', async () => {
        const token = jwt.sign({ email: 'team@test.com' }, JWT_SECRET);
        mockGetUser.mockResolvedValueOnce({ email: 'team@test.com', teamId: 'proj_100' });
        mockGetProjectById.mockResolvedValueOnce({ _id: 'proj_100', teamId: 'proj_100' });
        mockGetProgressLogs.mockResolvedValueOnce([
            { update_text: 'Update 1', delta_percentage: 10, timestamp: '2026-02-28T00:00:00Z' }
        ]);

        const event = {
            headers: { Authorization: `Bearer ${token}` },
            pathParameters: { teamId: 'proj_100' }
        };

        const response = await getHistory(event);
        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.teamId).toBe('proj_100');
        expect(body.logs.length).toBe(1);
    });
});
