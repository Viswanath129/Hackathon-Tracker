const jwt = require('jsonwebtoken');

const mockGetProjectById = jest.fn();
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock('../../services/dynamoService', () => ({
    getProjectById: mockGetProjectById
}));

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

const progressHandler = require('../../handlers/progress');

describe('Lambda Handlers - Progress', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: 'testsecret' };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('logUpdate', () => {
        it('should return 201 when logging progress is successful', async () => {
            const token = jwt.sign({ _id: 'user_1', email: 'user@test.com', role: 'user' }, 'testsecret');
            mockGetProjectById.mockResolvedValue({ _id: 'proj_1', team_id: 'user_1', type: 'PROJECT' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });

            const event = {
                httpMethod: 'POST',
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Testing Lambda', deltaPercentage: 10 })
            };

            const response = await progressHandler.logUpdate(event);
            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body).message).toBe('Progress update logged successfully');
        });

        it('should return 401 when token is missing or invalid', async () => {
            const event = {
                httpMethod: 'POST',
                headers: {},
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Testing Lambda', deltaPercentage: 10 })
            };

            const response = await progressHandler.logUpdate(event);
            expect(response.statusCode).toBe(401);
        });

        it('should return 404 when project does not exist', async () => {
            const token = jwt.sign({ _id: 'user_1', email: 'user@test.com' }, 'testsecret');
            mockGetProjectById.mockResolvedValue(null);

            const event = {
                httpMethod: 'POST',
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Testing Lambda', deltaPercentage: 10 })
            };

            const response = await progressHandler.logUpdate(event);
            expect(response.statusCode).toBe(404);
        });

        it('should return 403 when user is not authorized for the project (BOLA check)', async () => {
            const token = jwt.sign({ _id: 'user_2', email: 'attacker@test.com' }, 'testsecret');
            mockGetProjectById.mockResolvedValue({ _id: 'proj_1', team_id: 'user_1', type: 'PROJECT' });

            const event = {
                httpMethod: 'POST',
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Testing Lambda', deltaPercentage: 10 })
            };

            const response = await progressHandler.logUpdate(event);
            expect(response.statusCode).toBe(403);
        });
    });

    describe('getHistory', () => {
        it('should return 200 with progress logs for authorized user', async () => {
            const token = jwt.sign({ _id: 'user_1', email: 'user@test.com' }, 'testsecret');
            mockGetProjectById.mockResolvedValue({ _id: 'proj_1', team_id: 'user_1', type: 'PROJECT' });
            mockGetProgressLogs.mockResolvedValue([{ update_text: 'Update 1', delta_percentage: 5 }]);

            const event = {
                httpMethod: 'GET',
                headers: { authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj_1' }
            };

            const response = await progressHandler.getHistory(event);
            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toHaveLength(1);
        });

        it('should return 404 if project is not found', async () => {
            const token = jwt.sign({ _id: 'user_1', email: 'user@test.com' }, 'testsecret');
            mockGetProjectById.mockResolvedValue(null);

            const event = {
                httpMethod: 'GET',
                headers: { authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj_999' }
            };

            const response = await progressHandler.getHistory(event);
            expect(response.statusCode).toBe(404);
        });
    });
});
