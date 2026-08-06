// Prefix mock variables with 'mock' as per memory rules
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockGetProjectById = jest.fn();
const mockGetUser = jest.fn();
const mockGetAllUsers = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

jest.mock('../../services/dynamoService', () => ({
    getProjectById: mockGetProjectById,
    getUser: mockGetUser,
    getAllUsers: mockGetAllUsers
}));

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('progress lambda handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'test_secret';
    });

    test('logUpdate returns 400 on missing or invalid JSON body', async () => {
        const event = { body: "invalid json" };
        const response = await logUpdate(event);
        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body).message).toBe("Invalid JSON format");
    });

    test('logUpdate returns 401 on unauthenticated request', async () => {
        const event = { body: JSON.stringify({ teamId: 'proj_123', updateText: 'Test', deltaPercentage: 10 }), headers: {} };
        const response = await logUpdate(event);
        expect(response.statusCode).toBe(401);
        expect(JSON.parse(response.body).message).toBe("Unauthorized");
    });

    test('logUpdate returns 403 on BOLA check failure', async () => {
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ email: 'team@test.com' }, 'test_secret');
        const event = {
            body: JSON.stringify({ teamId: 'proj_123', updateText: 'Test', deltaPercentage: 10 }),
            headers: { Authorization: `Bearer ${token}` }
        };

        mockGetUser.mockResolvedValue({ _id: 'user_123', email: 'team@test.com', role: 'team' });
        mockGetProjectById.mockResolvedValue({ _id: 'proj_123', team_id: 'user_different' });

        const response = await logUpdate(event);
        expect(response.statusCode).toBe(403);
        expect(JSON.parse(response.body).message).toBe("Forbidden");
    });

    test('logUpdate returns 201 on success', async () => {
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ email: 'team@test.com' }, 'test_secret');
        const event = {
            body: JSON.stringify({ teamId: 'proj_123', updateText: 'Test', deltaPercentage: 10 }),
            headers: { Authorization: `Bearer ${token}` }
        };

        mockGetUser.mockResolvedValue({ _id: 'user_123', email: 'team@test.com', role: 'team' });
        mockGetProjectById.mockResolvedValue({ _id: 'proj_123', team_id: 'user_123' });
        mockLogProgress.mockResolvedValue({ success: true });

        const response = await logUpdate(event);
        expect(response.statusCode).toBe(201);
        expect(JSON.parse(response.body).success).toBe(true);
    });

    test('getHistory returns progress logs successfully', async () => {
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ email: 'team@test.com' }, 'test_secret');
        const event = {
            pathParameters: { teamId: 'proj_123' },
            headers: { Authorization: `Bearer ${token}` }
        };

        mockGetUser.mockResolvedValue({ _id: 'user_123', email: 'team@test.com', role: 'team' });
        mockGetProjectById.mockResolvedValue({ _id: 'proj_123', team_id: 'user_123' });
        mockGetProgressLogs.mockResolvedValue([{ log: 1 }]);

        const response = await getHistory(event);
        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual([{ log: 1 }]);
    });
});
