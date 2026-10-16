const jwt = require('jsonwebtoken');

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

describe('Lambda progress handlers', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: 'testsecret', CORS_ORIGIN: 'http://localhost:5173' };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    const createToken = (payload) => jwt.sign(payload, 'testsecret');

    describe('logUpdate handler', () => {
        test('returns 200 on OPTIONS preflight request', async () => {
            const event = { httpMethod: 'OPTIONS' };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(200);
            expect(response.headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
        });

        test('returns 401 Unauthorized if Authorization header is missing', async () => {
            const event = { headers: {} };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(401);
            expect(JSON.parse(response.body).message).toBe('Unauthorized');
        });

        test('returns 401 Unauthorized if JWT token verification fails', async () => {
            const event = { headers: { authorization: 'Bearer invalidtoken' } };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(401);
        });

        test('returns 400 Bad Request if request body is missing or unparseable', async () => {
            const token = createToken({ teamId: 'team1' });
            const event1 = { headers: { authorization: `Bearer ${token}` } };
            const response1 = await logUpdate(event1);
            expect(response1.statusCode).toBe(400);

            const event2 = { headers: { authorization: `Bearer ${token}` }, body: 'invalid json' };
            const response2 = await logUpdate(event2);
            expect(response2.statusCode).toBe(400);
        });

        test('returns 400 Bad Request on validation failure', async () => {
            const token = createToken({ teamId: 'team1' });
            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'team1', updateText: 'test', deltaPercentage: true })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
        });

        test('returns 404 Not Found if project does not exist', async () => {
            const token = createToken({ teamId: 'team1' });
            mockGetProjectById.mockResolvedValue(null);

            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'team1', updateText: 'test', deltaPercentage: 15 })
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(404);
            expect(JSON.parse(response.body).message).toBe('Project not found');
        });

        test('returns 403 Forbidden on BOLA ownership mismatch', async () => {
            const token = createToken({ teamId: 'team_alpha', email: 'alpha@example.com' });
            mockGetProjectById.mockResolvedValue({ _id: 'team_beta', teamId: 'team_beta', email: 'beta@example.com' });

            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'team_beta', updateText: 'test', deltaPercentage: 15 })
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(403);
            expect(JSON.parse(response.body).message).toBe('Forbidden: Access denied');
        });

        test('returns 201 Created on successful progress update', async () => {
            const token = createToken({ teamId: 'team_alpha' });
            mockGetProjectById.mockResolvedValue({ _id: 'team_alpha', teamId: 'team_alpha' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });

            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'team_alpha', updateText: 'Added unit tests', deltaPercentage: 20 })
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body).message).toBe('Progress updated successfully');
        });

        test('returns 500 Internal Server Error on unexpected service error', async () => {
            const token = createToken({ teamId: 'team_alpha' });
            mockGetProjectById.mockRejectedValue(new Error('DynamoDB Error'));

            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'team_alpha', updateText: 'Added unit tests', deltaPercentage: 20 })
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory handler', () => {
        test('returns 401 Unauthorized if Authorization header is missing', async () => {
            const event = { pathParameters: { teamId: 'team1' } };
            const response = await getHistory(event);
            expect(response.statusCode).toBe(401);
        });

        test('returns 404 Not Found if project does not exist', async () => {
            const token = createToken({ teamId: 'team1' });
            mockGetProjectById.mockResolvedValue(null);

            const event = {
                headers: { authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'team1' }
            };

            const response = await getHistory(event);
            expect(response.statusCode).toBe(404);
        });

        test('returns 403 Forbidden if user does not own project', async () => {
            const token = createToken({ teamId: 'team_alpha' });
            mockGetProjectById.mockResolvedValue({ teamId: 'team_beta' });

            const event = {
                headers: { authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'team_beta' }
            };

            const response = await getHistory(event);
            expect(response.statusCode).toBe(403);
        });

        test('returns 200 OK with progress history logs on success', async () => {
            const token = createToken({ teamId: 'team_alpha' });
            mockGetProjectById.mockResolvedValue({ teamId: 'team_alpha' });
            mockGetProgressLogs.mockResolvedValue([
                { update_text: 'Phase 1', delta_percentage: 50 }
            ]);

            const event = {
                headers: { authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'team_alpha' }
            };

            const response = await getHistory(event);
            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body).progress).toHaveLength(1);
        });
    });
});
