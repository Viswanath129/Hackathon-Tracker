const jwt = require('jsonwebtoken');

const mockDynamoService = {
    getUser: jest.fn(),
    getAllUsers: jest.fn(),
    getProjectById: jest.fn()
};

const mockProgressService = {
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
};

jest.mock('../../services/dynamoService', () => mockDynamoService);
jest.mock('../../services/progressService', () => mockProgressService);

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Progress Lambda Handlers', () => {
    const SECRET = 'testsecret';

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = SECRET;
        process.env.CORS_ORIGIN = 'http://localhost:5173';
    });

    describe('logUpdate handler', () => {
        test('returns 400 when body is missing', async () => {
            const res = await logUpdate({ httpMethod: 'POST' });
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Request body missing');
        });

        test('returns 400 when validation fails', async () => {
            const res = await logUpdate({
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: '', updateText: 'Log', deltaPercentage: 10 })
            });
            expect(res.statusCode).toBe(400);
        });

        test('returns 401 when token is invalid or missing', async () => {
            const res = await logUpdate({
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Log', deltaPercentage: 10 })
            });
            expect(res.statusCode).toBe(401);
        });

        test('returns 404 when project does not exist', async () => {
            const token = jwt.sign({ email: 'team@test.com' }, SECRET);
            mockDynamoService.getUser.mockResolvedValueOnce({ _id: 'team_1', email: 'team@test.com' });
            mockDynamoService.getProjectById.mockResolvedValueOnce(null);

            const res = await logUpdate({
                httpMethod: 'POST',
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_nonexistent', updateText: 'Log', deltaPercentage: 10 })
            });

            expect(res.statusCode).toBe(404);
            expect(JSON.parse(res.body).message).toBe('Project not found');
        });

        test('returns 403 when user does not own project', async () => {
            const token = jwt.sign({ email: 'team@test.com' }, SECRET);
            mockDynamoService.getUser.mockResolvedValueOnce({ _id: 'team_1', email: 'team@test.com' });
            mockDynamoService.getProjectById.mockResolvedValueOnce({ _id: 'proj_1', team_id: 'other_team' });

            const res = await logUpdate({
                httpMethod: 'POST',
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Log', deltaPercentage: 10 })
            });

            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body).message).toBe('Forbidden');
        });

        test('returns 201 Created on valid request and authorization', async () => {
            const token = jwt.sign({ email: 'team@test.com' }, SECRET);
            mockDynamoService.getUser.mockResolvedValueOnce({ _id: 'team_1', email: 'team@test.com' });
            mockDynamoService.getProjectById.mockResolvedValueOnce({ _id: 'proj_1', team_id: 'team_1' });
            mockProgressService.logProgress.mockResolvedValueOnce({ success: true, timestamp: '2026-01-01' });

            const res = await logUpdate({
                httpMethod: 'POST',
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Log update', deltaPercentage: 10 })
            });

            expect(res.statusCode).toBe(201);
            expect(JSON.parse(res.body).message).toBe('Progress logged successfully');
        });
    });

    describe('getHistory handler', () => {
        test('returns 400 when teamId parameter is missing', async () => {
            const res = await getHistory({ httpMethod: 'GET', pathParameters: {} });
            expect(res.statusCode).toBe(400);
        });

        test('returns 401 when unauthenticated', async () => {
            const res = await getHistory({ httpMethod: 'GET', pathParameters: { teamId: 'proj_1' } });
            expect(res.statusCode).toBe(401);
        });

        test('returns 200 OK with logs when authorized', async () => {
            const token = jwt.sign({ email: 'team@test.com' }, SECRET);
            mockDynamoService.getUser.mockResolvedValueOnce({ _id: 'team_1', email: 'team@test.com' });
            mockDynamoService.getProjectById.mockResolvedValueOnce({ _id: 'proj_1', team_id: 'team_1' });
            mockProgressService.getProgressLogs.mockResolvedValueOnce([{ update_text: 'Update 1' }]);

            const res = await getHistory({
                httpMethod: 'GET',
                headers: { authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj_1' }
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.data).toHaveLength(1);
        });
    });
});
