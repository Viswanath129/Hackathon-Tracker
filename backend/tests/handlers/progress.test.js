const jwt = require('jsonwebtoken');

const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Lambda Progress Handlers', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: 'testsecret', CORS_ORIGIN: 'http://localhost:5173' };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('logUpdate handler', () => {
        test('should return 200 OK for OPTIONS preflight request', async () => {
            const event = { httpMethod: 'OPTIONS' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(200);
            expect(res.headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
            expect(res.headers['Access-Control-Allow-Methods']).toBe('OPTIONS,POST,GET');
        });

        test('should return 400 Bad Request if request body is missing', async () => {
            const event = { httpMethod: 'POST', body: null };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toMatch(/missing/i);
        });

        test('should return 400 Bad Request if JSON parsing fails', async () => {
            const event = { httpMethod: 'POST', body: 'invalid json {' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toMatch(/invalid json/i);
        });

        test('should return 400 Bad Request if validation fails', async () => {
            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'team1', updateText: 'test', deltaPercentage: true })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
        });

        test('should return 401 Unauthorized if token is missing or secret unconfigured', async () => {
            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'team1', updateText: 'test', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
        });

        test('should return 403 Forbidden on BOLA failure for non-admin user accessing another project', async () => {
            const token = jwt.sign({ email: 'user@test.com', role: 'team', teamId: 'my_team' }, 'testsecret');
            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'other_team', updateText: 'test', deltaPercentage: 10 })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body).message).toMatch(/forbidden/i);
        });

        test('should return 201 Created on successful logUpdate', async () => {
            const token = jwt.sign({ email: 'user@test.com', role: 'team', teamId: 'team123' }, 'testsecret');
            mockLogProgress.mockResolvedValueOnce({ success: true, timestamp: '2026-02-28T00:00:00Z' });

            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'team123', updateText: 'Feature complete', deltaPercentage: 20 })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            expect(res.headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
            const body = JSON.parse(res.body);
            expect(body.message).toMatch(/logged successfully/i);
            expect(mockLogProgress).toHaveBeenCalledWith('team123', 'Feature complete', 20);
        });

        test('should return 500 Internal Server Error if service throws an error', async () => {
            const token = jwt.sign({ email: 'user@test.com', role: 'admin' }, 'testsecret');
            mockLogProgress.mockRejectedValueOnce(new Error('DynamoDB Error'));

            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'team123', updateText: 'Feature complete', deltaPercentage: 20 })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory handler', () => {
        test('should return 200 OK with logs on successful request', async () => {
            const token = jwt.sign({ email: 'user@test.com', role: 'team', teamId: 'team123' }, 'testsecret');
            const mockLogs = [{ SK: 'LOG#123', update_text: 'Test', delta_percentage: 10 }];
            mockGetProgressLogs.mockResolvedValueOnce(mockLogs);

            const event = {
                httpMethod: 'GET',
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'team123' }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body)).toEqual(mockLogs);
            expect(mockGetProgressLogs).toHaveBeenCalledWith('team123');
        });

        test('should return 400 Bad Request if pathParameter teamId is missing', async () => {
            const event = { httpMethod: 'GET', pathParameters: null };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(400);
        });

        test('should return 500 Internal Server Error on unexpected failure', async () => {
            const token = jwt.sign({ email: 'admin@test.com', role: 'admin' }, 'testsecret');
            mockGetProgressLogs.mockRejectedValueOnce(new Error('Query failed'));

            const event = {
                httpMethod: 'GET',
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'team123' }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).message).toBe('Internal Server Error');
        });
    });
});
