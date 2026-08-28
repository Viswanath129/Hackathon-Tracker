const { logUpdate, getHistory } = require('../../handlers/progress');
const progressService = require('../../services/progressService');
const dynamoService = require('../../services/dynamoService');
const jwt = require('jsonwebtoken');

jest.mock('../../services/progressService');
jest.mock('../../services/dynamoService');
jest.mock('jsonwebtoken');

describe('Progress Lambda Handlers', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: 'testsecret', CORS_ORIGIN: 'http://localhost:5173' };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('logUpdate', () => {
        it('should return 204 for OPTIONS preflight request', async () => {
            const event = { httpMethod: 'OPTIONS' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(204);
            expect(res.headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
        });

        it('should return 400 if request body is missing', async () => {
            const event = { httpMethod: 'POST', body: null };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Missing request body');
        });

        it('should return 400 if JSON body parsing fails', async () => {
            const event = { httpMethod: 'POST', body: 'invalid-json{' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Invalid JSON body');
        });

        it('should return 400 if input validation fails', async () => {
            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: '', updateText: 'test', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('teamId must be a non-empty string');
        });

        it('should return 401 if authorization header is missing or invalid', async () => {
            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'p1', updateText: 'test', deltaPercentage: 10 }),
                headers: {}
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body).message).toBe('Unauthorized');
        });

        it('should return 403 if user lacks project ownership', async () => {
            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'p1', updateText: 'test', deltaPercentage: 10 }),
                headers: { Authorization: 'Bearer validtoken' }
            };

            jwt.verify.mockReturnValue({ email: 'user@example.com' });
            dynamoService.getUser.mockResolvedValue({ _id: 'u1', email: 'user@example.com', role: 'team' });
            dynamoService.getProjectById.mockResolvedValue({ _id: 'p1', team_id: 'other_team' });

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body).message).toBe('Forbidden: Insufficient project permissions');
        });

        it('should return 201 on successful progress update', async () => {
            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'p1', updateText: 'Feature completed', deltaPercentage: 25 }),
                headers: { authorization: 'Bearer validtoken' }
            };

            jwt.verify.mockReturnValue({ email: 'user@example.com' });
            dynamoService.getUser.mockResolvedValue({ _id: 't1', email: 'user@example.com', role: 'team' });
            dynamoService.getProjectById.mockResolvedValue({ _id: 'p1', team_id: 't1' });
            progressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            const body = JSON.parse(res.body);
            expect(body.message).toBe('Progress update logged successfully');
            expect(body.data.success).toBe(true);
        });

        it('should return generic 500 Internal Server Error on internal exception', async () => {
            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'p1', updateText: 'Feature completed', deltaPercentage: 25 }),
                headers: { authorization: 'Bearer validtoken' }
            };

            jwt.verify.mockImplementation(() => { throw new Error('Database connection failed'); });

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory', () => {
        it('should return 400 if teamId path parameter is missing', async () => {
            const event = { httpMethod: 'GET', pathParameters: {} };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('teamId path parameter is required');
        });

        it('should return 401 if unauthorized', async () => {
            const event = { httpMethod: 'GET', pathParameters: { teamId: 'p1' }, headers: {} };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(401);
        });

        it('should return 200 and progress logs on success', async () => {
            const event = {
                httpMethod: 'GET',
                pathParameters: { teamId: 'p1' },
                headers: { Authorization: 'Bearer validtoken' }
            };

            const mockLogs = [
                { PK: 'PROJ#p1', SK: 'LOG#1', update_text: 'Update 1', delta_percentage: 10 }
            ];

            jwt.verify.mockReturnValue({ email: 'admin@example.com' });
            dynamoService.getUser.mockResolvedValue({ _id: 'admin1', email: 'admin@example.com', role: 'admin' });
            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body)).toEqual(mockLogs);
        });
    });
});
