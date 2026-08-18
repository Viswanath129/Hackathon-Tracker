const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockGetUser = jest.fn();
const mockGetAllUsers = jest.fn();
const mockGetProjectById = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

jest.mock('../../services/dynamoService', () => ({
    getUser: mockGetUser,
    getAllUsers: mockGetAllUsers,
    getProjectById: mockGetProjectById
}));

const jwt = require('jsonwebtoken');
const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Lambda progress handlers', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv, JWT_SECRET: 'testsecret', CORS_ORIGIN: 'http://localhost:5173' };
        jest.clearAllMocks();
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('logUpdate handler', () => {
        test('returns 400 when request body is missing', async () => {
            const res = await logUpdate({});
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Missing request body');
        });

        test('returns 400 when body contains invalid JSON', async () => {
            const res = await logUpdate({ body: 'invalid json {' });
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Invalid JSON body');
        });

        test('returns 400 when input validation fails', async () => {
            const res = await logUpdate({ body: JSON.stringify({ teamId: '', updateText: 'Text', deltaPercentage: 10 }) });
            expect(res.statusCode).toBe(400);
        });

        test('returns 401 when auth header is missing', async () => {
            const event = {
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Valid update', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body).message).toBe('Unauthorized');
        });

        test('returns 404 when project is not found', async () => {
            const token = jwt.sign({ email: 'user@test.com', role: 'user', id: 'user1' }, 'testsecret');
            mockGetUser.mockResolvedValue({ _id: 'user1', email: 'user@test.com', role: 'user' });
            mockGetProjectById.mockResolvedValue(null);

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Valid update', deltaPercentage: 10 })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(404);
            expect(JSON.parse(res.body).message).toBe('Project not found');
        });

        test('returns 403 when user is not owner or admin (BOLA)', async () => {
            const token = jwt.sign({ email: 'user2@test.com', role: 'user', id: 'user2' }, 'testsecret');
            mockGetUser.mockResolvedValue({ _id: 'user2', email: 'user2@test.com', role: 'user' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', team_id: 'user1', PK: 'HACK#h1' });

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Valid update', deltaPercentage: 10 })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body).message).toContain('Forbidden');
        });

        test('returns 201 on successful progress update by project owner', async () => {
            const token = jwt.sign({ email: 'user1@test.com', role: 'user', id: 'user1' }, 'testsecret');
            mockGetUser.mockResolvedValue({ _id: 'user1', email: 'user1@test.com', role: 'user' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', team_id: 'user1', PK: 'USER#user1@test.com' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Valid update', deltaPercentage: 10 })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            expect(res.headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
            const body = JSON.parse(res.body);
            expect(body.message).toBe('Progress update logged successfully');
            expect(body.timestamp).toBe('2026-03-01T00:00:00.000Z');
        });

        test('returns 201 on successful progress update by admin', async () => {
            const token = jwt.sign({ email: 'admin@test.com', role: 'admin', id: 'admin1' }, 'testsecret');
            mockGetUser.mockResolvedValue({ _id: 'admin1', email: 'admin@test.com', role: 'admin' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', team_id: 'user1', PK: 'USER#user1@test.com' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Admin update', deltaPercentage: 15 })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
        });

        test('returns 500 when JWT_SECRET is unconfigured', async () => {
            delete process.env.JWT_SECRET;
            const event = {
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Valid update', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory handler', () => {
        test('returns 400 when teamId path parameter is missing', async () => {
            const res = await getHistory({ pathParameters: {} });
            expect(res.statusCode).toBe(400);
        });

        test('returns 200 and logs array on success', async () => {
            const token = jwt.sign({ email: 'user1@test.com', role: 'user', id: 'user1' }, 'testsecret');
            mockGetUser.mockResolvedValue({ _id: 'user1', email: 'user1@test.com', role: 'user' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', team_id: 'user1' });
            const mockLogs = [{ SK: 'LOG#1', update_text: 'Update 1', delta_percentage: 20 }];
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj1' }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body)).toEqual(mockLogs);
        });
    });
});
