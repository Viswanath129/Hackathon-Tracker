const jwt = require('jsonwebtoken');

// Define mock functions prefixed with 'mock' for jest.mock scope safety
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

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Lambda Progress Handlers', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: 'testsecret123', CORS_ORIGIN: 'http://localhost:5173' };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('logUpdate Lambda Handler', () => {
        test('should return 401 if Authorization header is missing', async () => {
            const event = { headers: {}, body: JSON.stringify({ teamId: 'proj_1', updateText: 'Log', deltaPercentage: 10 }) };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body)).toEqual({ message: 'Unauthorized: Missing or invalid token' });
        });

        test('should return 401 if JWT token is invalid', async () => {
            const event = {
                headers: { Authorization: 'Bearer invalidtoken' },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Log', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body)).toEqual({ message: 'Unauthorized: Invalid token' });
        });

        test('should return 400 if event body is missing', async () => {
            const token = jwt.sign({ _id: 'proj_1', role: 'team' }, 'testsecret123');
            const event = { headers: { Authorization: `Bearer ${token}` }, body: null };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body)).toEqual({ message: 'Request body is required' });
        });

        test('should return 400 for invalid JSON payload', async () => {
            const token = jwt.sign({ _id: 'proj_1', role: 'team' }, 'testsecret123');
            const event = { headers: { Authorization: `Bearer ${token}` }, body: '{invalid-json' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body)).toEqual({ message: 'Invalid JSON payload' });
        });

        test('should return 400 if validation fails', async () => {
            const token = jwt.sign({ _id: 'proj_1', role: 'team' }, 'testsecret123');
            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: '', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body)).toEqual({ message: 'updateText is required and must be a non-empty string' });
        });

        test('should return 404 if project is not found', async () => {
            const token = jwt.sign({ _id: 'proj_1', role: 'team' }, 'testsecret123');
            mockGetProjectById.mockResolvedValue(null);

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Testing log', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(404);
            expect(JSON.parse(res.body)).toEqual({ message: 'Project not found' });
        });

        test('should return 404 for BOLA authorization mismatch', async () => {
            const token = jwt.sign({ _id: 'proj_2', teamId: 'proj_2', role: 'team' }, 'testsecret123');
            mockGetProjectById.mockResolvedValue({ _id: 'proj_1', PK: 'HACK#h1', SK: 'PROJ#proj_1' });

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Unauthorized log attempt', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(404);
            expect(JSON.parse(res.body)).toEqual({ message: 'Project not found' });
        });

        test('should return 201 Created on successful progress update log', async () => {
            const token = jwt.sign({ _id: 'proj_1', teamId: 'proj_1', role: 'team' }, 'testsecret123');
            const timestamp = new Date().toISOString();
            mockGetProjectById.mockResolvedValue({ _id: 'proj_1', teamId: 'proj_1' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp });

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Successfully updated model', deltaPercentage: 15 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            expect(JSON.parse(res.body)).toEqual({
                message: 'Progress update logged successfully',
                timestamp
            });
        });

        test('should return 500 with generic message on internal error', async () => {
            const token = jwt.sign({ _id: 'proj_1', teamId: 'proj_1', role: 'team' }, 'testsecret123');
            mockGetProjectById.mockRejectedValue(new Error('DynamoDB Error'));

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Updated text', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body)).toEqual({ message: 'Internal Server Error' });
        });
    });

    describe('getHistory Lambda Handler', () => {
        test('should return 401 if token is missing', async () => {
            const event = { headers: {}, pathParameters: { teamId: 'proj_1' } };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(401);
        });

        test('should return 404 if project does not exist', async () => {
            const token = jwt.sign({ _id: 'proj_1', teamId: 'proj_1', role: 'team' }, 'testsecret123');
            mockGetProjectById.mockResolvedValue(null);

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj_1' }
            };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(404);
        });

        test('should return 200 OK with progress logs for authorized project', async () => {
            const token = jwt.sign({ _id: 'proj_1', teamId: 'proj_1', role: 'team' }, 'testsecret123');
            const mockLogs = [{ SK: 'LOG#2026-01-01', update_text: 'Initial log', delta_percentage: 10 }];
            mockGetProjectById.mockResolvedValue({ _id: 'proj_1', teamId: 'proj_1' });
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj_1' }
            };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body)).toEqual(mockLogs);
        });
    });
});
