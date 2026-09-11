const jwt = require('jsonwebtoken');

const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args)
}));

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Lambda progress handlers', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: 'test-jwt-secret' };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('logUpdate', () => {
        test('returns 201 on successful update logging', async () => {
            const token = jwt.sign({ teamId: 'team_1', role: 'team' }, 'test-jwt-secret');
            mockLogProgress.mockResolvedValueOnce({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    teamId: 'team_1',
                    updateText: 'Integrated API endpoints',
                    deltaPercentage: 20
                })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            const body = JSON.parse(res.body);
            expect(body.message).toMatch(/success/i);
            expect(mockLogProgress).toHaveBeenCalledWith('team_1', 'Integrated API endpoints', 20);
        });

        test('returns 400 when body is missing or invalid JSON', async () => {
            const event = {
                headers: { Authorization: 'Bearer token' },
                body: 'invalid-json'
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
        });

        test('returns 401 when token is missing or invalid', async () => {
            const event = {
                headers: {},
                body: JSON.stringify({
                    teamId: 'team_1',
                    updateText: 'Integrated API endpoints',
                    deltaPercentage: 20
                })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
        });

        test('returns 403 when authorization check fails (BOLA)', async () => {
            const token = jwt.sign({ teamId: 'other_team', role: 'team' }, 'test-jwt-secret');

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    teamId: 'team_1',
                    updateText: 'Integrated API endpoints',
                    deltaPercentage: 20
                })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
        });
    });

    describe('getHistory', () => {
        test('returns 200 with progress logs on success', async () => {
            const token = jwt.sign({ teamId: 'team_1', role: 'team' }, 'test-jwt-secret');
            const mockLogs = [
                { PK: 'PROJ#team_1', SK: 'LOG#1', update_text: 'Initial log', delta_percentage: 10 }
            ];
            mockGetProgressLogs.mockResolvedValueOnce(mockLogs);

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'team_1' }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body).toEqual(mockLogs);
            expect(mockGetProgressLogs).toHaveBeenCalledWith('team_1');
        });

        test('returns 403 when user attempts to access another team progress history', async () => {
            const token = jwt.sign({ teamId: 'other_team', role: 'team' }, 'test-jwt-secret');

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'team_1' }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(403);
        });
    });
});
