const jwt = require('jsonwebtoken');

const mockDynamoService = {
    getProjectById: jest.fn()
};

const mockProgressService = {
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
};

jest.mock('../../services/dynamoService', () => mockDynamoService);
jest.mock('../../services/progressService', () => mockProgressService);

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Progress Lambda Handlers', () => {
    const SECRET = 'test_secret_key_123';
    let validToken;

    beforeAll(() => {
        process.env.JWT_SECRET = SECRET;
        validToken = jwt.sign(
            { _id: 'user_1', teamId: 'proj_123', email: 'test@example.com', role: 'user' },
            SECRET
        );
    });

    afterAll(() => {
        delete process.env.JWT_SECRET;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate Handler', () => {
        test('returns 400 when body is missing', async () => {
            const event = { headers: { authorization: `Bearer ${validToken}` } };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
        });

        test('returns 400 when JSON parsing fails', async () => {
            const event = {
                headers: { authorization: `Bearer ${validToken}` },
                body: '{ invalid json '
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Invalid JSON request body');
        });

        test('returns 401 when token is missing or invalid', async () => {
            const event = { body: JSON.stringify({ teamId: 'proj_123', updateText: 'test', deltaPercentage: 10 }) };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(401);
        });

        test('returns 404 when project does not exist', async () => {
            mockDynamoService.getProjectById.mockResolvedValue(null);
            const event = {
                headers: { authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'proj_missing', updateText: 'test', deltaPercentage: 10 })
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(404);
            expect(JSON.parse(response.body).message).toBe('Project not found');
        });

        test('returns 403 when user does not own project', async () => {
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj_other', teamId: 'other_team' });
            const event = {
                headers: { authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'proj_other', updateText: 'test', deltaPercentage: 10 })
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(403);
        });

        test('returns 201 on successful progress update', async () => {
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj_123', teamId: 'proj_123' });
            mockProgressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28' });

            const event = {
                headers: { authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'proj_123', updateText: 'Feature complete', deltaPercentage: 20 })
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body).message).toBe('Progress update logged successfully');
        });
    });

    describe('getHistory Handler', () => {
        test('returns 401 when token authorization fails', async () => {
            const event = { pathParameters: { teamId: 'proj_123' } };
            const response = await getHistory(event);
            expect(response.statusCode).toBe(401);
        });

        test('returns 404 when project is missing', async () => {
            mockDynamoService.getProjectById.mockResolvedValue(null);
            const event = {
                headers: { authorization: `Bearer ${validToken}` },
                pathParameters: { teamId: 'proj_missing' }
            };

            const response = await getHistory(event);
            expect(response.statusCode).toBe(404);
        });

        test('returns 200 with progress history', async () => {
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj_123', teamId: 'proj_123' });
            mockProgressService.getProgressLogs.mockResolvedValue([{ SK: 'LOG#1', update_text: 'Update' }]);

            const event = {
                headers: { authorization: `Bearer ${validToken}` },
                pathParameters: { teamId: 'proj_123' }
            };

            const response = await getHistory(event);
            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual([{ SK: 'LOG#1', update_text: 'Update' }]);
        });
    });
});
