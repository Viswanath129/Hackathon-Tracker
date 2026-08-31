const mockProgressService = {
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
};

const mockDynamoService = {
    getAllProjects: jest.fn()
};

jest.mock('../../services/progressService', () => mockProgressService);
jest.mock('../../services/dynamoService', () => mockDynamoService);

const jwt = require('jsonwebtoken');
const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Progress Lambda Handlers', () => {
    const originalJwtSecret = process.env.JWT_SECRET;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'test_secret_key';
    });

    afterAll(() => {
        process.env.JWT_SECRET = originalJwtSecret;
    });

    describe('logUpdate', () => {
        test('returns 200 for OPTIONS request (CORS preflight)', async () => {
            const event = { httpMethod: 'OPTIONS' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(200);
        });

        test('returns 400 if event body is missing', async () => {
            const event = { httpMethod: 'POST' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Request body is required');
        });

        test('returns 400 if JSON parsing fails', async () => {
            const event = { httpMethod: 'POST', body: 'invalid-json{' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Invalid JSON format in request body');
        });

        test('returns 400 if input validation fails', async () => {
            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 't1', updateText: 'test', deltaPercentage: true })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
        });

        test('returns 403 if user is not authorized for project', async () => {
            const token = jwt.sign({ _id: 'user1', email: 'user1@test.com', role: 'user' }, process.env.JWT_SECRET);
            mockDynamoService.getAllProjects.mockResolvedValue([
                { _id: 'proj1', team_id: 'other_user' }
            ]);

            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Progress update', deltaPercentage: 10 })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
        });

        test('returns 201 on successful progress update', async () => {
            const token = jwt.sign({ _id: 'user1', email: 'user1@test.com', role: 'user' }, process.env.JWT_SECRET);
            mockDynamoService.getAllProjects.mockResolvedValue([]);
            mockProgressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });

            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'user1', updateText: 'Progress update', deltaPercentage: 10 })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            expect(mockProgressService.logProgress).toHaveBeenCalledWith('user1', 'Progress update', 10);
            const body = JSON.parse(res.body);
            expect(body.message).toBe('Progress log recorded successfully');
        });

        test('returns 500 on internal service failure', async () => {
            mockProgressService.logProgress.mockRejectedValue(new Error('DynamoDB connection failed'));

            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'team1', updateText: 'Progress update', deltaPercentage: 10 })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory', () => {
        test('returns 400 if teamId path parameter is missing', async () => {
            const event = { httpMethod: 'GET', pathParameters: {} };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(400);
        });

        test('returns 200 with progress logs on success', async () => {
            const mockLogs = [
                { PK: 'PROJ#team1', SK: 'LOG#123', update_text: 'Started project', delta_percentage: 20 }
            ];
            mockProgressService.getProgressLogs.mockResolvedValue(mockLogs);

            const event = {
                httpMethod: 'GET',
                pathParameters: { teamId: 'team1' }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body)).toEqual(mockLogs);
        });
    });
});
