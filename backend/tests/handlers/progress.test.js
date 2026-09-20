const mockProgressService = {
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
};

const mockDynamoService = {
    getProjectById: jest.fn()
};

jest.mock('../../services/progressService', () => mockProgressService);
jest.mock('../../services/dynamoService', () => mockDynamoService);

const jwt = require('jsonwebtoken');
const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Lambda Handlers - Progress', () => {
    const origSecret = process.env.JWT_SECRET;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'test-secret';
    });

    afterAll(() => {
        process.env.JWT_SECRET = origSecret;
    });

    describe('logUpdate handler', () => {
        it('returns 200 for OPTIONS preflight request', async () => {
            const event = { httpMethod: 'OPTIONS' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(200);
        });

        it('returns 400 when body is missing', async () => {
            const res = await logUpdate({});
            expect(res.statusCode).toBe(400);
            const body = JSON.parse(res.body);
            expect(body.message).toBe('Missing request body');
        });

        it('returns 400 when body is invalid JSON', async () => {
            const res = await logUpdate({ body: '{ invalid json }' });
            expect(res.statusCode).toBe(400);
            const body = JSON.parse(res.body);
            expect(body.message).toBe('Invalid JSON format in request body');
        });

        it('returns 400 when deltaPercentage is a boolean', async () => {
            const payload = { teamId: 'proj123', updateText: 'Testing', deltaPercentage: true };
            const res = await logUpdate({ body: JSON.stringify(payload) });
            expect(res.statusCode).toBe(400);
            const body = JSON.parse(res.body);
            expect(body.message).toBe('deltaPercentage must be a numeric value between -100 and 100');
        });

        it('returns 404 when project is not found', async () => {
            mockDynamoService.getProjectById.mockResolvedValue(null);
            const payload = { teamId: 'proj999', updateText: 'Testing', deltaPercentage: 10 };
            const res = await logUpdate({ body: JSON.stringify(payload) });
            expect(res.statusCode).toBe(404);
            expect(JSON.parse(res.body).message).toBe('Project not found');
        });

        it('returns 201 when update is successfully logged', async () => {
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj123', teamId: 'proj123', type: 'PROJECT' });
            mockProgressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });

            const payload = { teamId: 'proj123', updateText: 'Milestone reached', deltaPercentage: 25 };
            const res = await logUpdate({ body: JSON.stringify(payload) });

            expect(res.statusCode).toBe(201);
            const body = JSON.parse(res.body);
            expect(body.message).toBe('Progress update logged successfully');
            expect(mockProgressService.logProgress).toHaveBeenCalledWith('proj123', 'Milestone reached', 25);
        });

        it('returns 500 when progressService throws an internal error', async () => {
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj123', teamId: 'proj123', type: 'PROJECT' });
            mockProgressService.logProgress.mockRejectedValue(new Error('DynamoDB Connection Failed'));

            const payload = { teamId: 'proj123', updateText: 'Error case', deltaPercentage: 10 };
            const res = await logUpdate({ body: JSON.stringify(payload) });

            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory handler', () => {
        it('returns 401 when Authorization header is missing', async () => {
            const event = { pathParameters: { teamId: 'proj123' } };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body).message).toBe('Unauthorized: Missing authorization header');
        });

        it('returns 401 when Authorization token verification fails', async () => {
            const event = {
                pathParameters: { teamId: 'proj123' },
                headers: { Authorization: 'Bearer invalid.token.here' }
            };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body).message).toBe('Unauthorized: Token verification failed');
        });

        it('returns 404 when project does not exist', async () => {
            const token = jwt.sign({ email: 'user@example.com', teamId: 'proj123' }, process.env.JWT_SECRET);
            mockDynamoService.getProjectById.mockResolvedValue(null);

            const event = {
                pathParameters: { teamId: 'proj123' },
                headers: { Authorization: `Bearer ${token}` }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(404);
            expect(JSON.parse(res.body).message).toBe('Project not found');
        });

        it('returns 200 with history data when authorization passes', async () => {
            const token = jwt.sign({ email: 'user@example.com', teamId: 'proj123' }, process.env.JWT_SECRET);
            const mockLogs = [
                { update_text: 'Log 1', delta_percentage: 10, timestamp: '2026-03-01T00:00:00.000Z' }
            ];

            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj123', teamId: 'proj123', email: 'user@example.com', type: 'PROJECT' });
            mockProgressService.getProgressLogs.mockResolvedValue(mockLogs);

            const event = {
                pathParameters: { teamId: 'proj123' },
                headers: { Authorization: `Bearer ${token}` }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.data).toEqual(mockLogs);
        });
    });
});
