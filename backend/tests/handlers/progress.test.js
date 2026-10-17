const mockDynamoService = {
    getProjectById: jest.fn()
};

const mockProgressService = {
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
};

jest.mock('../../services/dynamoService', () => mockDynamoService);
jest.mock('../../services/progressService', () => mockProgressService);

const jwt = require('jsonwebtoken');
const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Lambda Handler - logUpdate', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: 'testsecret', CORS_ORIGIN: 'http://localhost:5173' };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    test('returns 401 if authorization header is missing', async () => {
        const event = { headers: {} };
        const response = await logUpdate(event);
        expect(response.statusCode).toBe(401);
        expect(JSON.parse(response.body).message).toBe('Unauthorized');
    });

    test('returns 401 if JWT secret is unconfigured', async () => {
        delete process.env.JWT_SECRET;
        const event = { headers: { authorization: 'Bearer validtoken' } };
        const response = await logUpdate(event);
        expect(response.statusCode).toBe(401);
    });

    test('returns 400 if body is missing', async () => {
        const token = jwt.sign({ teamId: 'team123', email: 'user@test.com' }, 'testsecret');
        const event = {
            headers: { authorization: `Bearer ${token}` }
        };
        const response = await logUpdate(event);
        expect(response.statusCode).toBe(400);
    });

    test('returns 400 if input validation fails', async () => {
        const token = jwt.sign({ teamId: 'team123', email: 'user@test.com' }, 'testsecret');
        const event = {
            headers: { authorization: `Bearer ${token}` },
            body: JSON.stringify({ teamId: 'team123', updateText: 'Task', deltaPercentage: true })
        };
        const response = await logUpdate(event);
        expect(response.statusCode).toBe(400);
    });

    test('returns 404 if project is not found', async () => {
        mockDynamoService.getProjectById.mockResolvedValue(null);
        const token = jwt.sign({ teamId: 'team123', email: 'user@test.com' }, 'testsecret');
        const event = {
            headers: { authorization: `Bearer ${token}` },
            body: JSON.stringify({ teamId: 'team123', updateText: 'Doing task', deltaPercentage: 20 })
        };
        const response = await logUpdate(event);
        expect(response.statusCode).toBe(404);
    });

    test('returns 404 on BOLA mismatch (project belongs to another team)', async () => {
        mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj456', teamId: 'team456', type: 'PROJECT' });
        const token = jwt.sign({ teamId: 'team123', email: 'user@test.com' }, 'testsecret');
        const event = {
            headers: { authorization: `Bearer ${token}` },
            body: JSON.stringify({ teamId: 'team456', updateText: 'Doing task', deltaPercentage: 20 })
        };
        const response = await logUpdate(event);
        expect(response.statusCode).toBe(404);
    });

    test('returns 201 Created on successful progress update', async () => {
        mockDynamoService.getProjectById.mockResolvedValue({ _id: 'team123', teamId: 'team123', type: 'PROJECT' });
        mockProgressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00Z' });

        const token = jwt.sign({ teamId: 'team123', email: 'user@test.com' }, 'testsecret');
        const event = {
            headers: { authorization: `Bearer ${token}` },
            body: JSON.stringify({ teamId: 'team123', updateText: 'Doing task', deltaPercentage: 20 })
        };
        const response = await logUpdate(event);
        expect(response.statusCode).toBe(201);
        expect(mockProgressService.logProgress).toHaveBeenCalledWith('team123', 'Doing task', 20);
    });

    test('returns 500 on internal service failure', async () => {
        mockDynamoService.getProjectById.mockRejectedValue(new Error('DynamoDB connection lost'));
        const token = jwt.sign({ teamId: 'team123', email: 'user@test.com' }, 'testsecret');
        const event = {
            headers: { authorization: `Bearer ${token}` },
            body: JSON.stringify({ teamId: 'team123', updateText: 'Doing task', deltaPercentage: 20 })
        };
        const response = await logUpdate(event);
        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.body).message).toBe('Internal Server Error');
    });
});

describe('Lambda Handler - getHistory', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: 'testsecret', CORS_ORIGIN: 'http://localhost:5173' };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    test('returns 401 if authorization header is missing', async () => {
        const event = { pathParameters: { teamId: 'team123' } };
        const response = await getHistory(event);
        expect(response.statusCode).toBe(401);
    });

    test('returns 404 if project not found or BOLA mismatch', async () => {
        mockDynamoService.getProjectById.mockResolvedValue(null);
        const token = jwt.sign({ teamId: 'team123', email: 'user@test.com' }, 'testsecret');
        const event = {
            headers: { authorization: `Bearer ${token}` },
            pathParameters: { teamId: 'team123' }
        };
        const response = await getHistory(event);
        expect(response.statusCode).toBe(404);
    });

    test('returns 200 OK with progress history logs', async () => {
        mockDynamoService.getProjectById.mockResolvedValue({ _id: 'team123', teamId: 'team123', type: 'PROJECT' });
        const dummyLogs = [{ update_text: 'Log 1', delta_percentage: 10 }];
        mockProgressService.getProgressLogs.mockResolvedValue(dummyLogs);

        const token = jwt.sign({ teamId: 'team123', email: 'user@test.com' }, 'testsecret');
        const event = {
            headers: { authorization: `Bearer ${token}` },
            pathParameters: { teamId: 'team123' }
        };
        const response = await getHistory(event);
        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual(dummyLogs);
    });
});
