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

describe('Lambda progress handler', () => {
    const originalEnv = process.env;
    const testSecret = 'secret12345';
    let validToken;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: testSecret, CORS_ORIGIN: 'http://localhost:5173' };
        validToken = jwt.sign({ teamId: 'team123', email: 'team@test.com' }, testSecret);
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('logUpdate handler', () => {
        test('returns 401 Unauthorized if Authorization header is missing', async () => {
            const event = { headers: {}, body: JSON.stringify({ teamId: 'team123' }) };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body)).toEqual({ message: 'Unauthorized' });
        });

        test('returns 400 Bad Request for invalid JSON body', async () => {
            const event = {
                headers: { Authorization: `Bearer ${validToken}` },
                body: '{ invalid json'
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body)).toEqual({ message: 'Invalid JSON body' });
        });

        test('returns 400 Bad Request for invalid input parameters', async () => {
            const event = {
                headers: { Authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'team123', updateText: 'test', deltaPercentage: true })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toContain('deltaPercentage');
        });

        test('returns 404 Not Found if project does not exist', async () => {
            mockGetProjectById.mockResolvedValue(null);
            const event = {
                headers: { Authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'team123', updateText: 'Valid log', deltaPercentage: 15 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(404);
            expect(JSON.parse(res.body)).toEqual({ message: 'Project not found' });
        });

        test('returns 403 Forbidden on BOLA ownership mismatch', async () => {
            const otherToken = jwt.sign({ teamId: 'otherTeam', email: 'other@test.com' }, testSecret);
            mockGetProjectById.mockResolvedValue({ _id: 'team123', type: 'PROJECT' });

            const event = {
                headers: { Authorization: `Bearer ${otherToken}` },
                body: JSON.stringify({ teamId: 'team123', updateText: 'Valid log', deltaPercentage: 15 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body)).toEqual({ message: 'Forbidden: You do not have access to this project' });
        });

        test('returns 201 Created on successful logUpdate', async () => {
            mockGetProjectById.mockResolvedValue({ _id: 'team123', type: 'PROJECT' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T12:00:00.000Z' });

            const event = {
                headers: { Authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'team123', updateText: 'Progress updated', deltaPercentage: 25 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            expect(JSON.parse(res.body)).toEqual({
                message: 'Progress logged successfully',
                data: { success: true, timestamp: '2026-02-28T12:00:00.000Z' }
            });
        });

        test('masks internal server errors and returns 500', async () => {
            mockGetProjectById.mockRejectedValue(new Error('DynamoDB Connection Failure'));

            const event = {
                headers: { Authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'team123', updateText: 'Progress updated', deltaPercentage: 25 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body)).toEqual({ message: 'Internal Server Error' });
        });
    });

    describe('getHistory handler', () => {
        test('returns 404 Not Found if project does not exist', async () => {
            mockGetProjectById.mockResolvedValue(null);

            const event = {
                headers: { Authorization: `Bearer ${validToken}` },
                pathParameters: { teamId: 'team123' }
            };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(404);
            expect(JSON.parse(res.body)).toEqual({ message: 'Project not found' });
        });

        test('returns 200 OK with history logs for authorized project owner', async () => {
            mockGetProjectById.mockResolvedValue({ _id: 'team123', type: 'PROJECT' });
            mockGetProgressLogs.mockResolvedValue([{ update_text: 'Log item', delta_percentage: 10 }]);

            const event = {
                headers: { Authorization: `Bearer ${validToken}` },
                pathParameters: { teamId: 'team123' }
            };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body)).toEqual([{ update_text: 'Log item', delta_percentage: 10 }]);
        });
    });
});
