const jwt = require('jsonwebtoken');

// Mocks
jest.mock('../../services/progressService', () => ({
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
}));

jest.mock('../../services/dynamoService', () => ({
    getUser: jest.fn(),
    getProjectById: jest.fn()
}));

const { logProgress, getProgressLogs } = require('../../services/progressService');
const dynamoService = require('../../services/dynamoService');
const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Lambda Handler: progress.js', () => {
    const origSecret = process.env.JWT_SECRET;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'testsecret';
    });

    afterAll(() => {
        process.env.JWT_SECRET = origSecret;
    });

    describe('logUpdate', () => {
        it('should return 400 if body is missing', async () => {
            const event = {};
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Missing request body');
        });

        it('should return 400 if body is invalid JSON', async () => {
            const event = { body: '{ invalid json' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Invalid JSON request body');
        });

        it('should return 400 if validation fails (e.g. missing updateText)', async () => {
            const event = {
                body: JSON.stringify({ teamId: 'proj123', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('updateText is required and must be a non-empty string');
        });

        it('should return 401 if authorization header is missing', async () => {
            const event = {
                body: JSON.stringify({ teamId: 'proj123', updateText: 'Made progress', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body).message).toBe('Not authorized, no token provided');
        });

        it('should return 403 if user is non-admin and not authorized for the project', async () => {
            const token = jwt.sign({ email: 'user@test.com' }, 'testsecret');
            dynamoService.getUser.mockResolvedValue({ email: 'user@test.com', role: 'user' });
            dynamoService.getProjectById.mockResolvedValue({ _id: 'proj123', userEmail: 'other@test.com', PK: 'USER#other@test.com' });

            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj123', updateText: 'Made progress', deltaPercentage: 10 })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body).message).toContain('Forbidden');
        });

        it('should return 201 on success for authorized admin user', async () => {
            const token = jwt.sign({ email: 'admin@test.com' }, 'testsecret');
            dynamoService.getUser.mockResolvedValue({ email: 'admin@test.com', role: 'admin' });
            logProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });

            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj123', updateText: 'Added unit tests', deltaPercentage: 25 })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            const body = JSON.parse(res.body);
            expect(body.message).toBe('Progress update logged successfully');
            expect(logProgress).toHaveBeenCalledWith('proj123', 'Added unit tests', 25);
        });
    });

    describe('getHistory', () => {
        it('should return 400 if teamId pathParameter is missing', async () => {
            const event = { pathParameters: {} };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('teamId path parameter is required');
        });

        it('should return 200 with logs on success for authorized user', async () => {
            const token = jwt.sign({ email: 'owner@test.com' }, 'testsecret');
            dynamoService.getUser.mockResolvedValue({ email: 'owner@test.com', role: 'user' });
            dynamoService.getProjectById.mockResolvedValue({ _id: 'proj123', userEmail: 'owner@test.com' });
            getProgressLogs.mockResolvedValue([
                { update_text: 'Phase 1 done', delta_percentage: 20 }
            ]);

            const event = {
                headers: { authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj123' }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.data.length).toBe(1);
            expect(body.data[0].update_text).toBe('Phase 1 done');
        });
    });
});
