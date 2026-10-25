const jwt = require('jsonwebtoken');

// Mock dependencies
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockGetProjectById = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

jest.mock('../../services/dynamoService', () => ({
    getProjectById: mockGetProjectById
}));

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Progress Handler (Lambda)', () => {
    const secret = 'test-secret';
    let originalEnv;

    beforeAll(() => {
        originalEnv = process.env.JWT_SECRET;
        process.env.JWT_SECRET = secret;
    });

    afterAll(() => {
        process.env.JWT_SECRET = originalEnv;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate', () => {
        test('returns 200 for OPTIONS preflight request', async () => {
            const event = { httpMethod: 'OPTIONS' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(200);
            expect(res.headers['Access-Control-Allow-Origin']).toBeDefined();
        });

        test('returns 401 when token is missing', async () => {
            const event = { httpMethod: 'POST', headers: {} };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body)).toEqual({ message: 'Unauthorized: Missing or invalid token' });
        });

        test('returns 400 when body is missing', async () => {
            const token = jwt.sign({ email: 'user@example.com', _id: 'user1' }, secret);
            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body)).toEqual({ message: 'Request body is missing' });
        });

        test('returns 400 when body has invalid JSON', async () => {
            const token = jwt.sign({ email: 'user@example.com', _id: 'user1' }, secret);
            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: '{ invalid json'
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body)).toEqual({ message: 'Invalid JSON body' });
        });

        test('returns 400 when validation fails (e.g., boolean deltaPercentage)', async () => {
            const token = jwt.sign({ email: 'user@example.com', _id: 'user1' }, secret);
            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    teamId: 'proj123',
                    updateText: 'Started design phase',
                    deltaPercentage: true
                })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body)).toEqual({ message: 'deltaPercentage cannot be a boolean' });
        });

        test('returns 404 when project does not exist', async () => {
            mockGetProjectById.mockResolvedValue(null);
            const token = jwt.sign({ email: 'user@example.com', _id: 'user1' }, secret);
            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    teamId: 'proj123',
                    updateText: 'Started design phase',
                    deltaPercentage: 15
                })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(404);
            expect(JSON.parse(res.body)).toEqual({ message: 'Project not found' });
            expect(mockGetProjectById).toHaveBeenCalledWith('proj123');
        });

        test('returns 403 when user does not own the project', async () => {
            mockGetProjectById.mockResolvedValue({ _id: 'proj123', team_id: 'other_team' });
            const token = jwt.sign({ email: 'user@example.com', _id: 'user1' }, secret);
            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    teamId: 'proj123',
                    updateText: 'Started design phase',
                    deltaPercentage: 15
                })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body)).toEqual({ message: 'Forbidden: You do not have access to this project' });
        });

        test('returns 201 Created on valid request and successful log', async () => {
            mockGetProjectById.mockResolvedValue({ _id: 'proj123', team_id: 'user1' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });

            const token = jwt.sign({ email: 'user@example.com', _id: 'user1' }, secret);
            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    teamId: 'proj123',
                    updateText: 'Completed module 1',
                    deltaPercentage: 25
                })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            const body = JSON.parse(res.body);
            expect(body.message).toBe('Progress update logged successfully');
            expect(body.data).toEqual({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });
            expect(mockLogProgress).toHaveBeenCalledWith('proj123', 'Completed module 1', 25);
        });

        test('returns 500 when error occurs during execution', async () => {
            mockGetProjectById.mockRejectedValue(new Error('Database error'));

            const token = jwt.sign({ email: 'user@example.com', _id: 'user1' }, secret);
            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    teamId: 'proj123',
                    updateText: 'Completed module 1',
                    deltaPercentage: 25
                })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body)).toEqual({ message: 'Internal Server Error' });
        });
    });

    describe('getHistory', () => {
        test('returns 200 for OPTIONS preflight request', async () => {
            const event = { httpMethod: 'OPTIONS' };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
        });

        test('returns 401 when token is missing', async () => {
            const event = { httpMethod: 'GET', headers: {} };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(401);
        });

        test('returns 404 when project is not found', async () => {
            mockGetProjectById.mockResolvedValue(null);
            const token = jwt.sign({ email: 'user@example.com', _id: 'user1' }, secret);
            const event = {
                httpMethod: 'GET',
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj123' }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(404);
            expect(JSON.parse(res.body)).toEqual({ message: 'Project not found' });
        });

        test('returns 403 when user does not own project', async () => {
            mockGetProjectById.mockResolvedValue({ _id: 'proj123', team_id: 'user2' });
            const token = jwt.sign({ email: 'user@example.com', _id: 'user1' }, secret);
            const event = {
                httpMethod: 'GET',
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj123' }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body)).toEqual({ message: 'Forbidden: You do not have access to this project' });
        });

        test('returns 200 OK with progress history logs', async () => {
            const mockLogs = [
                { PK: 'PROJ#proj123', SK: 'LOG#1', update_text: 'Started', delta_percentage: 10 }
            ];
            mockGetProjectById.mockResolvedValue({ _id: 'proj123', team_id: 'user1' });
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            const token = jwt.sign({ email: 'user@example.com', _id: 'user1' }, secret);
            const event = {
                httpMethod: 'GET',
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj123' }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body)).toEqual(mockLogs);
            expect(mockGetProgressLogs).toHaveBeenCalledWith('proj123');
        });
    });
});
