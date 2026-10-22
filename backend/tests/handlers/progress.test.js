const jwt = require('jsonwebtoken');

jest.mock('../../services/dynamoService', () => ({
    getUser: jest.fn(),
    getAllUsers: jest.fn(),
    getProjectById: jest.fn()
}));

jest.mock('../../services/progressService', () => ({
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
}));

const mockDynamoService = require('../../services/dynamoService');
const mockProgressService = require('../../services/progressService');
const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Lambda Progress Handlers', () => {
    const secret = 'test-secret';

    beforeAll(() => {
        process.env.JWT_SECRET = secret;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const createAuthToken = (email) => {
        return jwt.sign({ email }, secret);
    };

    describe('logUpdate', () => {
        test('returns 401 when authorization header is missing', async () => {
            const event = { headers: {} };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(401);
        });

        test('returns 400 when body is missing or invalid JSON', async () => {
            const token = createAuthToken('test@example.com');
            mockDynamoService.getUser.mockResolvedValue({ email: 'test@example.com', _id: 'user_1' });

            const eventMissingBody = {
                headers: { Authorization: `Bearer ${token}` }
            };
            const response1 = await logUpdate(eventMissingBody);
            expect(response1.statusCode).toBe(400);

            const eventInvalidJson = {
                headers: { Authorization: `Bearer ${token}` },
                body: 'invalid-json'
            };
            const response2 = await logUpdate(eventInvalidJson);
            expect(response2.statusCode).toBe(400);
        });

        test('returns 404 when project does not exist', async () => {
            const token = createAuthToken('test@example.com');
            mockDynamoService.getUser.mockResolvedValue({ email: 'test@example.com', _id: 'user_1' });
            mockDynamoService.getProjectById.mockResolvedValue(null);

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_999', updateText: 'Testing', deltaPercentage: 10 })
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.body);
            expect(body.message).toBe('Project not found');
        });

        test('returns 201 on successful update', async () => {
            const token = createAuthToken('test@example.com');
            mockDynamoService.getUser.mockResolvedValue({ email: 'test@example.com', _id: 'user_1' });
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj_123', teamId: 'user_1' });
            mockProgressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_123', updateText: 'Testing', deltaPercentage: 10 })
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);
            expect(body.message).toBe('Progress update logged successfully');
        });
    });

    describe('getHistory', () => {
        test('returns 200 on successful history fetch', async () => {
            const token = createAuthToken('test@example.com');
            mockDynamoService.getUser.mockResolvedValue({ email: 'test@example.com', _id: 'user_1' });
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj_123', teamId: 'user_1' });
            mockProgressService.getProgressLogs.mockResolvedValue([{ update_text: 'Initial log', delta_percentage: 15 }]);

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj_123' }
            };

            const response = await getHistory(event);
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.data).toHaveLength(1);
        });
    });
});
