const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args)
}));

const jwt = require('jsonwebtoken');
const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Progress Lambda Handlers', () => {
    const JWT_SECRET = 'test-jwt-secret';
    let validToken;
    let otherToken;

    beforeAll(() => {
        process.env.JWT_SECRET = JWT_SECRET;
        validToken = jwt.sign({ teamId: 'PROJ#100', role: 'team', email: 'team@test.com' }, JWT_SECRET);
        otherToken = jwt.sign({ teamId: 'PROJ#999', role: 'team', email: 'other@test.com' }, JWT_SECRET);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate Handler', () => {
        test('should handle OPTIONS preflight request', async () => {
            const res = await logUpdate({ httpMethod: 'OPTIONS' });
            expect(res.statusCode).toBe(200);
            expect(res.headers['Access-Control-Allow-Origin']).toBeDefined();
        });

        test('should return 400 when event body is missing or invalid JSON', async () => {
            const res = await logUpdate({ httpMethod: 'POST', body: null });
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).error).toMatch(/Invalid or missing/);

            const resInvalid = await logUpdate({ httpMethod: 'POST', body: 'invalid-json' });
            expect(resInvalid.statusCode).toBe(400);
        });

        test('should return 400 when input validation fails', async () => {
            const res = await logUpdate({
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: '', updateText: 'valid', deltaPercentage: 10 })
            });
            expect(res.statusCode).toBe(400);
        });

        test('should return 401 when authorization token is missing or invalid', async () => {
            const res = await logUpdate({
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'PROJ#100', updateText: 'Updated auth', deltaPercentage: 15 }),
                headers: {}
            });
            expect(res.statusCode).toBe(401);
        });

        test('should return 403 on BOLA / ownership mismatch', async () => {
            const res = await logUpdate({
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'PROJ#100', updateText: 'Updated auth', deltaPercentage: 15 }),
                headers: { Authorization: `Bearer ${otherToken}` }
            });
            expect(res.statusCode).toBe(403);
        });

        test('should return 201 Created on successful progress update', async () => {
            mockLogProgress.mockResolvedValueOnce({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });

            const res = await logUpdate({
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'PROJ#100', updateText: 'Feature completed', deltaPercentage: 20 }),
                headers: { Authorization: `Bearer ${validToken}` }
            });

            expect(res.statusCode).toBe(201);
            const body = JSON.parse(res.body);
            expect(body.message).toBe('Progress update logged successfully');
            expect(mockLogProgress).toHaveBeenCalledWith('PROJ#100', 'Feature completed', 20);
        });

        test('should return 500 when service throws an error', async () => {
            mockLogProgress.mockRejectedValueOnce(new Error('DynamoDB Error'));

            const res = await logUpdate({
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'PROJ#100', updateText: 'Feature completed', deltaPercentage: 20 }),
                headers: { Authorization: `Bearer ${validToken}` }
            });

            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).error).toBe('Internal Server Error');
        });
    });

    describe('getHistory Handler', () => {
        test('should return 400 if teamId path parameter is missing', async () => {
            const res = await getHistory({ httpMethod: 'GET', pathParameters: {} });
            expect(res.statusCode).toBe(400);
        });

        test('should return 401 if authorization header is missing', async () => {
            const res = await getHistory({
                httpMethod: 'GET',
                pathParameters: { teamId: 'PROJ#100' },
                headers: {}
            });
            expect(res.statusCode).toBe(401);
        });

        test('should return 403 on BOLA / ownership mismatch', async () => {
            const res = await getHistory({
                httpMethod: 'GET',
                pathParameters: { teamId: 'PROJ#100' },
                headers: { Authorization: `Bearer ${otherToken}` }
            });
            expect(res.statusCode).toBe(403);
        });

        test('should return 200 OK with progress history logs', async () => {
            const fakeLogs = [{ SK: 'LOG#123', update_text: 'Initial log', delta_percentage: 10 }];
            mockGetProgressLogs.mockResolvedValueOnce(fakeLogs);

            const res = await getHistory({
                httpMethod: 'GET',
                pathParameters: { teamId: 'PROJ#100' },
                headers: { Authorization: `Bearer ${validToken}` }
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.success).toBe(true);
            expect(body.data).toEqual(fakeLogs);
            expect(mockGetProgressLogs).toHaveBeenCalledWith('PROJ#100');
        });
    });
});
