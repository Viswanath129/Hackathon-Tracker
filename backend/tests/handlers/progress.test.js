const jwt = require('jsonwebtoken');

// Mock dependencies
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockGetProjectById = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args)
}));

jest.mock('../../services/dynamoService', () => ({
    getProjectById: (...args) => mockGetProjectById(...args)
}));

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Serverless Progress Lambda Handlers', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: 'test_jwt_secret', CORS_ORIGIN: 'http://localhost:5173' };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('logUpdate handler', () => {
        it('returns 401 when Authorization header is missing', async () => {
            const event = {
                httpMethod: 'POST',
                headers: {}
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(401);
            expect(JSON.parse(result.body).message).toMatch(/Unauthorized/);
        });

        it('returns 400 when request body is missing', async () => {
            const token = jwt.sign({ _id: 'user123', email: 'user@example.com' }, 'test_jwt_secret');
            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: null
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).message).toBe('Missing request body');
        });

        it('returns 400 when deltaPercentage is a boolean', async () => {
            const token = jwt.sign({ _id: 'user123', email: 'user@example.com' }, 'test_jwt_secret');
            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    teamId: 'proj123',
                    updateText: 'Completed task',
                    deltaPercentage: true
                })
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).message).toBe('deltaPercentage must be a numeric value');
        });

        it('returns 404 when project does not exist', async () => {
            const token = jwt.sign({ _id: 'user123', email: 'user@example.com' }, 'test_jwt_secret');
            mockGetProjectById.mockResolvedValue(null);

            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    teamId: 'nonexistent',
                    updateText: 'Update text',
                    deltaPercentage: 10
                })
            };

            const result = await logUpdate(event);
            expect(result.statusCode).toBe(404);
            expect(JSON.parse(result.body).message).toBe('Project not found');
        });

        it('returns 403 on BOLA check failure', async () => {
            const token = jwt.sign({ _id: 'attacker_id', email: 'attacker@example.com' }, 'test_jwt_secret');
            mockGetProjectById.mockResolvedValue({
                _id: 'proj123',
                team_id: 'owner_id',
                type: 'PROJECT'
            });

            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    teamId: 'proj123',
                    updateText: 'Unauthorized update',
                    deltaPercentage: 20
                })
            };

            const result = await logUpdate(event);
            expect(result.statusCode).toBe(403);
            expect(JSON.parse(result.body).message).toMatch(/Forbidden/);
        });

        it('returns 201 Created on successful progress update', async () => {
            const token = jwt.sign({ _id: 'user123', email: 'user@example.com' }, 'test_jwt_secret');
            mockGetProjectById.mockResolvedValue({
                _id: 'proj123',
                team_id: 'user123',
                type: 'PROJECT'
            });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });

            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    teamId: 'proj123',
                    updateText: 'Frontend feature completed',
                    deltaPercentage: 25
                })
            };

            const result = await logUpdate(event);
            expect(result.statusCode).toBe(201);
            expect(mockLogProgress).toHaveBeenCalledWith('proj123', 'Frontend feature completed', 25);
            expect(JSON.parse(result.body).message).toBe('Progress update logged successfully');
        });
    });

    describe('getHistory handler', () => {
        it('returns 401 when missing auth token', async () => {
            const event = {
                httpMethod: 'GET',
                pathParameters: { teamId: 'proj123' }
            };
            const result = await getHistory(event);
            expect(result.statusCode).toBe(401);
        });

        it('returns 404 when project is not found', async () => {
            const token = jwt.sign({ _id: 'user123', email: 'user@example.com' }, 'test_jwt_secret');
            mockGetProjectById.mockResolvedValue(null);

            const event = {
                httpMethod: 'GET',
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj999' }
            };

            const result = await getHistory(event);
            expect(result.statusCode).toBe(404);
            expect(JSON.parse(result.body).message).toBe('Project not found');
        });

        it('returns 200 OK with progress history logs', async () => {
            const token = jwt.sign({ _id: 'user123', email: 'user@example.com' }, 'test_jwt_secret');
            mockGetProjectById.mockResolvedValue({
                _id: 'proj123',
                team_id: 'user123',
                type: 'PROJECT'
            });
            const fakeLogs = [{ SK: 'LOG#2026-02-28', update_text: 'Done', delta_percentage: 10 }];
            mockGetProgressLogs.mockResolvedValue(fakeLogs);

            const event = {
                httpMethod: 'GET',
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj123' }
            };

            const result = await getHistory(event);
            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body).logs).toEqual(fakeLogs);
        });
    });
});
