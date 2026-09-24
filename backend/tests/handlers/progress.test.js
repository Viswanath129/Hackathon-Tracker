const jwt = require('jsonwebtoken');

const mockGetProjectById = jest.fn();
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock('../../services/dynamoService', () => ({
    getProjectById: (...args) => mockGetProjectById(...args)
}));

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args)
}));

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('AWS Lambda progress handler', () => {
    const originalEnv = process.env;
    const testSecret = 'secret_key_123';
    let validToken;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: testSecret, CORS_ORIGIN: 'http://localhost:5173' };
        validToken = jwt.sign({ _id: 'user_1', email: 'team1@test.com' }, testSecret);
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('logUpdate', () => {
        it('should handle OPTIONS preflight request', async () => {
            const event = { httpMethod: 'OPTIONS' };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(200);
            expect(response.headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
        });

        it('should return 401 if token is missing or invalid', async () => {
            const event = {
                headers: {},
                body: JSON.stringify({ teamId: 'p1', updateText: 'test', deltaPercentage: 10 })
            };
            const resNoHeader = await logUpdate(event);
            expect(resNoHeader.statusCode).toBe(401);

            const resInvalidToken = await logUpdate({
                headers: { Authorization: 'Bearer invalid_token' },
                body: event.body
            });
            expect(resInvalidToken.statusCode).toBe(401);
        });

        it('should return 401 if JWT_SECRET is missing from environment', async () => {
            delete process.env.JWT_SECRET;
            const event = {
                headers: { Authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'p1', updateText: 'test', deltaPercentage: 10 })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(401);
        });

        it('should return 400 if body is missing or malformed JSON', async () => {
            const eventNoBody = {
                headers: { Authorization: `Bearer ${validToken}` }
            };
            const resNoBody = await logUpdate(eventNoBody);
            expect(resNoBody.statusCode).toBe(400);

            const eventBadJson = {
                headers: { Authorization: `Bearer ${validToken}` },
                body: 'invalid-json'
            };
            const resBadJson = await logUpdate(eventBadJson);
            expect(resBadJson.statusCode).toBe(400);
        });

        it('should return 400 if input validation fails (e.g. boolean deltaPercentage)', async () => {
            const event = {
                headers: { Authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'p1', updateText: 'test', deltaPercentage: true })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('deltaPercentage must be a numeric value');
        });

        it('should return 404 if project does not exist', async () => {
            mockGetProjectById.mockResolvedValue(null);
            const event = {
                headers: { Authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'p_nonexistent', updateText: 'test', deltaPercentage: 10 })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(404);
            expect(JSON.parse(response.body).message).toBe('Project not found');
        });

        it('should return 403 if project ownership check fails (BOLA protection)', async () => {
            mockGetProjectById.mockResolvedValue({
                _id: 'p1',
                teamEmail: 'another_team@test.com'
            });
            const event = {
                headers: { Authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'p1', updateText: 'test', deltaPercentage: 10 })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(403);
            expect(JSON.parse(response.body).message).toContain('Forbidden');
        });

        it('should return 201 on successful progress update logging', async () => {
            mockGetProjectById.mockResolvedValue({
                _id: 'p1',
                teamEmail: 'team1@test.com'
            });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T12:00:00.000Z' });

            const event = {
                headers: { Authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'p1', updateText: 'Added authentication', deltaPercentage: 15 })
            };
            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);
            expect(body.message).toBe('Progress update logged successfully');
            expect(body.timestamp).toBe('2026-02-28T12:00:00.000Z');
        });

        it('should return 500 on unexpected errors', async () => {
            mockGetProjectById.mockRejectedValue(new Error('DynamoDB Connection Exception'));
            const event = {
                headers: { Authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'p1', updateText: 'test', deltaPercentage: 10 })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory', () => {
        it('should handle OPTIONS preflight request', async () => {
            const response = await getHistory({ httpMethod: 'OPTIONS' });
            expect(response.statusCode).toBe(200);
        });

        it('should return 401 if authorization token is missing or invalid', async () => {
            const response = await getHistory({ headers: {}, pathParameters: { teamId: 'p1' } });
            expect(response.statusCode).toBe(401);
        });

        it('should return 400 if teamId pathParameter is missing', async () => {
            const response = await getHistory({
                headers: { Authorization: `Bearer ${validToken}` },
                pathParameters: null
            });
            expect(response.statusCode).toBe(400);
        });

        it('should return 404 if project does not exist', async () => {
            mockGetProjectById.mockResolvedValue(null);
            const response = await getHistory({
                headers: { Authorization: `Bearer ${validToken}` },
                pathParameters: { teamId: 'p_nonexistent' }
            });
            expect(response.statusCode).toBe(404);
        });

        it('should return 403 if project ownership check fails', async () => {
            mockGetProjectById.mockResolvedValue({
                _id: 'p1',
                teamEmail: 'other@test.com'
            });
            const response = await getHistory({
                headers: { Authorization: `Bearer ${validToken}` },
                pathParameters: { teamId: 'p1' }
            });
            expect(response.statusCode).toBe(403);
        });

        it('should return 200 with history array on success', async () => {
            mockGetProjectById.mockResolvedValue({
                _id: 'p1',
                teamEmail: 'team1@test.com'
            });
            const mockLogs = [
                { update_text: 'Update 1', delta_percentage: 10, timestamp: '2026-02-28T10:00:00.000Z' }
            ];
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory({
                headers: { Authorization: `Bearer ${validToken}` },
                pathParameters: { teamId: 'p1' }
            });

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
        });

        it('should return 500 on unexpected errors', async () => {
            mockGetProjectById.mockRejectedValue(new Error('Internal Error'));
            const response = await getHistory({
                headers: { Authorization: `Bearer ${validToken}` },
                pathParameters: { teamId: 'p1' }
            });
            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });
});
