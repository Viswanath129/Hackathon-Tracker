const jwt = require('jsonwebtoken');
const dynamoService = require('../../services/dynamoService');
const progressService = require('../../services/progressService');
const { logUpdate, getHistory } = require('../../handlers/progress');

jest.mock('jsonwebtoken');
jest.mock('../../services/dynamoService');
jest.mock('../../services/progressService');

describe('Lambda progress handler - logUpdate', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: 'test_secret' };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    test('returns 200 for OPTIONS preflight request', async () => {
        const event = { httpMethod: 'OPTIONS' };
        const res = await logUpdate(event);
        expect(res.statusCode).toBe(200);
    });

    test('returns 401 if Authorization header is missing', async () => {
        const event = { headers: {} };
        const res = await logUpdate(event);
        expect(res.statusCode).toBe(401);
        expect(JSON.parse(res.body).message).toMatch(/Missing or invalid Authorization header/);
    });

    test('returns 401 if JWT_SECRET is missing', async () => {
        delete process.env.JWT_SECRET;
        const event = { headers: { authorization: 'Bearer token123' } };
        const res = await logUpdate(event);
        expect(res.statusCode).toBe(401);
    });

    test('returns 401 if token verification fails', async () => {
        jwt.verify.mockImplementation(() => {
            throw new Error('invalid token');
        });
        const event = { headers: { authorization: 'Bearer invalid_token' } };
        const res = await logUpdate(event);
        expect(res.statusCode).toBe(401);
    });

    test('returns 400 for invalid JSON in body', async () => {
        jwt.verify.mockReturnValue({ email: 'user@example.com' });
        dynamoService.getUser.mockResolvedValue({ _id: 'user1', email: 'user@example.com' });

        const event = {
            headers: { authorization: 'Bearer valid_token' },
            body: '{ invalid json '
        };
        const res = await logUpdate(event);
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body).message).toMatch(/Invalid JSON/);
    });

    test('returns 400 for invalid validation payload', async () => {
        jwt.verify.mockReturnValue({ email: 'user@example.com' });
        dynamoService.getUser.mockResolvedValue({ _id: 'user1', email: 'user@example.com' });

        const event = {
            headers: { authorization: 'Bearer valid_token' },
            body: JSON.stringify({ teamId: 'proj1', updateText: 'log', deltaPercentage: 'invalid_number' })
        };
        const res = await logUpdate(event);
        expect(res.statusCode).toBe(400);
    });

    test('returns 404 when project does not exist', async () => {
        jwt.verify.mockReturnValue({ email: 'user@example.com' });
        dynamoService.getUser.mockResolvedValue({ _id: 'user1', email: 'user@example.com' });
        dynamoService.getProjectById.mockResolvedValue(null);

        const event = {
            headers: { authorization: 'Bearer valid_token' },
            body: JSON.stringify({ teamId: 'nonexistent_proj', updateText: 'log', deltaPercentage: 10 })
        };
        const res = await logUpdate(event);
        expect(res.statusCode).toBe(404);
    });

    test('returns 404 on BOLA authorization failure', async () => {
        jwt.verify.mockReturnValue({ email: 'user@example.com' });
        dynamoService.getUser.mockResolvedValue({ _id: 'user1', email: 'user@example.com', role: 'team' });
        dynamoService.getProjectById.mockResolvedValue({ _id: 'proj1', team_id: 'other_user' });

        const event = {
            headers: { authorization: 'Bearer valid_token' },
            body: JSON.stringify({ teamId: 'proj1', updateText: 'log', deltaPercentage: 10 })
        };
        const res = await logUpdate(event);
        expect(res.statusCode).toBe(404);
    });

    test('returns 201 Created on successful progress logging', async () => {
        jwt.verify.mockReturnValue({ email: 'user@example.com' });
        dynamoService.getUser.mockResolvedValue({ _id: 'user1', email: 'user@example.com', role: 'team' });
        dynamoService.getProjectById.mockResolvedValue({ _id: 'proj1', team_id: 'user1' });
        progressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });

        const event = {
            headers: { authorization: 'Bearer valid_token' },
            body: JSON.stringify({ teamId: 'proj1', updateText: 'Completed task', deltaPercentage: 20 })
        };
        const res = await logUpdate(event);
        expect(res.statusCode).toBe(201);
        const parsed = JSON.parse(res.body);
        expect(parsed.message).toBe('Progress update logged successfully');
        expect(parsed.timestamp).toBe('2026-03-01T00:00:00.000Z');
    });

    test('returns 500 on unexpected service failure', async () => {
        jwt.verify.mockReturnValue({ email: 'user@example.com' });
        dynamoService.getUser.mockResolvedValue({ _id: 'user1', email: 'user@example.com', role: 'team' });
        dynamoService.getProjectById.mockRejectedValue(new Error('DynamoDB Error'));

        const event = {
            headers: { authorization: 'Bearer valid_token' },
            body: JSON.stringify({ teamId: 'proj1', updateText: 'log', deltaPercentage: 10 })
        };
        const res = await logUpdate(event);
        expect(res.statusCode).toBe(500);
        expect(JSON.parse(res.body).message).toBe('Internal Server Error');
    });
});

describe('Lambda progress handler - getHistory', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: 'test_secret' };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    test('returns 400 if teamId pathParameter is missing', async () => {
        jwt.verify.mockReturnValue({ email: 'user@example.com' });
        dynamoService.getUser.mockResolvedValue({ _id: 'user1', email: 'user@example.com' });

        const event = {
            headers: { authorization: 'Bearer valid_token' },
            pathParameters: {}
        };
        const res = await getHistory(event);
        expect(res.statusCode).toBe(400);
    });

    test('returns 200 OK with history logs for owned project', async () => {
        jwt.verify.mockReturnValue({ email: 'user@example.com' });
        dynamoService.getUser.mockResolvedValue({ _id: 'user1', email: 'user@example.com', role: 'team' });
        dynamoService.getProjectById.mockResolvedValue({ _id: 'proj1', team_id: 'user1' });
        const mockLogs = [
            { PK: 'PROJ#proj1', SK: 'LOG#1', update_text: 'Update 1', delta_percentage: 10 }
        ];
        progressService.getProgressLogs.mockResolvedValue(mockLogs);

        const event = {
            headers: { authorization: 'Bearer valid_token' },
            pathParameters: { teamId: 'proj1' }
        };
        const res = await getHistory(event);
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body)).toEqual(mockLogs);
    });
});
