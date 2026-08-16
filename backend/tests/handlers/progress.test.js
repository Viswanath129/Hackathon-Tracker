const jwt = require('jsonwebtoken');

const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockGetProjectById = jest.fn();
const mockGetHackathon = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args)
}));

jest.mock('../../services/dynamoService', () => ({
    getProjectById: (...args) => mockGetProjectById(...args),
    getHackathon: (...args) => mockGetHackathon(...args)
}));

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Lambda Progress Handlers', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv, JWT_SECRET: 'testsecretkey' };
        jest.clearAllMocks();
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('logUpdate handler', () => {
        test('returns 400 when body is missing', async () => {
            const event = { httpMethod: 'POST' };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('missing');
        });

        test('returns 400 when JSON body is invalid', async () => {
            const event = { httpMethod: 'POST', body: '{ invalid json' };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('Invalid JSON');
        });

        test('returns 400 when input validation fails', async () => {
            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: '', updateText: 'test', deltaPercentage: 10 })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
        });

        test('returns 401 when token is missing or invalid', async () => {
            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'team1@example.com', updateText: 'test', deltaPercentage: 10 }),
                headers: {}
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(401);
        });

        test('returns 403 when user is not authorized for teamId (BOLA failure)', async () => {
            const token = jwt.sign({ email: 'other@example.com', role: 'user' }, 'testsecretkey');
            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'target@example.com', updateText: 'test', deltaPercentage: 10 }),
                headers: { authorization: `Bearer ${token}` }
            };
            mockGetProjectById.mockResolvedValue(null);

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(403);
            expect(JSON.parse(response.body).message).toContain('Forbidden');
        });

        test('returns 201 Created on successful progress update', async () => {
            const token = jwt.sign({ email: 'team1@example.com', role: 'user' }, 'testsecretkey');
            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'team1@example.com', updateText: 'Completed task', deltaPercentage: 20 }),
                headers: { authorization: `Bearer ${token}` }
            };
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00Z' });

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(201);
            expect(mockLogProgress).toHaveBeenCalledWith('team1@example.com', 'Completed task', 20);
            expect(JSON.parse(response.body).message).toContain('logged successfully');
        });
    });

    describe('getHistory handler', () => {
        test('returns 400 when teamId pathParameter is missing', async () => {
            const event = { httpMethod: 'GET', pathParameters: {} };
            const response = await getHistory(event);
            expect(response.statusCode).toBe(400);
        });

        test('returns 401 when token is missing', async () => {
            const event = { httpMethod: 'GET', pathParameters: { teamId: 'team1@example.com' } };
            const response = await getHistory(event);
            expect(response.statusCode).toBe(401);
        });

        test('returns 200 OK with history logs on success', async () => {
            const token = jwt.sign({ email: 'team1@example.com', role: 'user' }, 'testsecretkey');
            const event = {
                httpMethod: 'GET',
                pathParameters: { teamId: 'team1@example.com' },
                headers: { authorization: `Bearer ${token}` }
            };
            const mockLogs = [
                { PK: 'PROJ#team1@example.com', SK: 'LOG#1', update_text: 'Update 1', delta_percentage: 10 }
            ];
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);
            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body).data).toEqual(mockLogs);
        });
    });
});
