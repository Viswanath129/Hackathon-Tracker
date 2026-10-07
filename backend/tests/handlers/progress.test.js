const jwt = require('jsonwebtoken');

const mockGetProjectById = jest.fn();
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock('../../services/dynamoService', () => ({
    getProjectById: (...args) => mockGetProjectById(...args)
}));

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args)
}));

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Lambda Progress Handlers', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: 'test_jwt_secret' };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('logUpdate', () => {
        test('returns 401 if token is missing', async () => {
            const event = {
                httpMethod: 'POST',
                headers: {},
                body: JSON.stringify({ teamId: 'p1', updateText: 'test', deltaPercentage: 10 })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(401);
            expect(JSON.parse(response.body)).toEqual({ message: 'Unauthorized' });
        });

        test('returns 400 if body is missing', async () => {
            const token = jwt.sign({ _id: 't1' }, 'test_jwt_secret');
            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: null
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body)).toEqual({ message: 'Missing request body' });
        });

        test('returns 404 if project is not found', async () => {
            const token = jwt.sign({ _id: 't1' }, 'test_jwt_secret');
            mockGetProjectById.mockResolvedValue(null);

            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'p1', updateText: 'test', deltaPercentage: 10 })
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(404);
            expect(JSON.parse(response.body)).toEqual({ message: 'Project not found' });
        });

        test('returns 403 if ownership check fails (BOLA protection)', async () => {
            const token = jwt.sign({ _id: 't1' }, 'test_jwt_secret');
            mockGetProjectById.mockResolvedValue({ _id: 'p1', team_id: 't2' });

            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'p1', updateText: 'test', deltaPercentage: 10 })
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(403);
            expect(JSON.parse(response.body)).toEqual({ message: 'Access denied: Project ownership check failed' });
        });

        test('returns 201 Created on successful log', async () => {
            const token = jwt.sign({ _id: 't1' }, 'test_jwt_secret');
            mockGetProjectById.mockResolvedValue({ _id: 'p1', team_id: 't1' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });

            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'p1', updateText: 'Progressing nicely', deltaPercentage: 15 })
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({
                message: 'Progress logged successfully',
                result: { success: true, timestamp: '2026-03-01T00:00:00.000Z' }
            });
        });
    });

    describe('getHistory', () => {
        test('returns 200 OK with progress history', async () => {
            const token = jwt.sign({ _id: 't1' }, 'test_jwt_secret');
            const mockLogs = [{ SK: 'LOG#2026-03-01', update_text: 'Progressing', delta_percentage: 15 }];
            mockGetProjectById.mockResolvedValue({ _id: 'p1', team_id: 't1' });
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            const event = {
                httpMethod: 'GET',
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'p1' }
            };

            const response = await getHistory(event);
            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
        });
    });
});
