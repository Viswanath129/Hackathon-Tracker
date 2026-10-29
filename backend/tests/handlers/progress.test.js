const jwt = require('jsonwebtoken');

const mockDynamoService = {
    getUser: jest.fn(),
    getAllUsers: jest.fn(),
    getProjectById: jest.fn(),
    saveProgressLog: jest.fn(),
    getProgressLogs: jest.fn()
};

jest.mock('../../services/dynamoService', () => mockDynamoService);

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Lambda progress handlers', () => {
    const origJwtSecret = process.env.JWT_SECRET;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'testsecret';
    });

    afterAll(() => {
        process.env.JWT_SECRET = origJwtSecret;
    });

    describe('logUpdate handler', () => {
        test('handles OPTIONS request with CORS headers', async () => {
            const event = { httpMethod: 'OPTIONS' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(200);
            expect(res.headers['Access-Control-Allow-Origin']).toBeDefined();
        });

        test('returns 401 if token is missing or invalid', async () => {
            const event = { headers: {} };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
        });

        test('returns 400 if body is missing or invalid JSON', async () => {
            const token = jwt.sign({ email: 'user@test.com' }, 'testsecret');
            mockDynamoService.getUser.mockResolvedValue({ email: 'user@test.com', _id: 'u1' });

            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: 'invalid-json{'
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
        });

        test('returns 404 if project is not found', async () => {
            const token = jwt.sign({ email: 'user@test.com' }, 'testsecret');
            mockDynamoService.getUser.mockResolvedValue({ email: 'user@test.com', _id: 'u1' });
            mockDynamoService.getProjectById.mockResolvedValue(null);

            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'p1', updateText: 'Text', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(404);
        });

        test('returns 403 if unauthorized (BOLA check failed)', async () => {
            const token = jwt.sign({ email: 'user@test.com' }, 'testsecret');
            mockDynamoService.getUser.mockResolvedValue({ email: 'user@test.com', _id: 'u1', teamId: 't1' });
            mockDynamoService.getProjectById.mockResolvedValue({ teamId: 'otherTeam', _id: 'p2' });

            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'p2', updateText: 'Text', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
        });

        test('returns 201 Created on successful log update', async () => {
            const token = jwt.sign({ email: 'user@test.com' }, 'testsecret');
            mockDynamoService.getUser.mockResolvedValue({ email: 'user@test.com', _id: 'p1', teamId: 'p1' });
            mockDynamoService.getProjectById.mockResolvedValue({ teamId: 'p1', _id: 'p1' });
            mockDynamoService.saveProgressLog.mockResolvedValue({ _id: 'log1', updateText: 'Text' });

            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'p1', updateText: 'Text', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            expect(JSON.parse(res.body)).toHaveProperty('data');
        });

        test('returns 500 on unexpected service failure', async () => {
            const token = jwt.sign({ email: 'user@test.com' }, 'testsecret');
            mockDynamoService.getUser.mockRejectedValue(new Error('DB failure'));

            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'p1', updateText: 'Text', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory handler', () => {
        test('returns 200 OK with logs list', async () => {
            const token = jwt.sign({ email: 'user@test.com' }, 'testsecret');
            mockDynamoService.getUser.mockResolvedValue({ email: 'user@test.com', _id: 'p1', teamId: 'p1' });
            mockDynamoService.getProjectById.mockResolvedValue({ teamId: 'p1', _id: 'p1' });
            mockDynamoService.getProgressLogs.mockResolvedValue([{ _id: 'log1' }]);

            const event = {
                headers: { authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'p1' }
            };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body).data).toHaveLength(1);
        });
    });
});
