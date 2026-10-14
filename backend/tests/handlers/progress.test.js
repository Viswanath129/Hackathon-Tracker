const jwt = require('jsonwebtoken');

// Define mock functions with 'mock' prefix
const mockGetProjectById = jest.fn();
const mockGetUser = jest.fn();
const mockGetAllUsers = jest.fn();
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock('../../services/dynamoService', () => ({
    getProjectById: (...args) => mockGetProjectById(...args),
    getUser: (...args) => mockGetUser(...args),
    getAllUsers: (...args) => mockGetAllUsers(...args),
}));

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args),
}));

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Lambda Handlers - Progress', () => {
    const origEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...origEnv, JWT_SECRET: 'test-secret', CORS_ORIGIN: 'http://localhost:5173' };
    });

    afterAll(() => {
        process.env = origEnv;
    });

    describe('logUpdate handler', () => {
        it('returns 400 when event is missing or body is invalid JSON', async () => {
            const resMissing = await logUpdate(null);
            expect(resMissing.statusCode).toBe(400);

            const resInvalidJson = await logUpdate({ body: 'invalid-json{' });
            expect(resInvalidJson.statusCode).toBe(400);
        });

        it('returns 401 when authorization header is missing or token is invalid', async () => {
            const res = await logUpdate({
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Testing', deltaPercentage: 10 })
            });
            expect(res.statusCode).toBe(401);
        });

        it('returns 400 when validation fails (e.g. deltaPercentage is a boolean)', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'test-secret');
            const res = await logUpdate({
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Testing', deltaPercentage: true })
            });
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toContain('boolean');
        });

        it('returns 404 when project is not found', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'test-secret');
            mockGetUser.mockResolvedValue({ email: 'user@example.com', teamId: 'proj1' });
            mockGetProjectById.mockResolvedValue(null);

            const res = await logUpdate({
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Testing', deltaPercentage: 10 })
            });

            expect(res.statusCode).toBe(404);
            expect(JSON.parse(res.body).message).toBe('Project not found');
        });

        it('returns 403 when user does not own project (BOLA check failure)', async () => {
            const token = jwt.sign({ email: 'attacker@example.com' }, 'test-secret');
            mockGetUser.mockResolvedValue({ email: 'attacker@example.com', teamId: 'other-team' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', teamEmail: 'owner@example.com', teamId: 'owner-team' });

            const res = await logUpdate({
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Hacking', deltaPercentage: 50 })
            });

            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body).message).toContain('Forbidden');
        });

        it('returns 201 Created on successful progress update', async () => {
            const token = jwt.sign({ email: 'owner@example.com' }, 'test-secret');
            mockGetUser.mockResolvedValue({ email: 'owner@example.com', teamId: 'proj1' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', teamEmail: 'owner@example.com' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });

            const res = await logUpdate({
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Feature complete', deltaPercentage: 25 })
            });

            expect(res.statusCode).toBe(201);
            const data = JSON.parse(res.body);
            expect(data.message).toBe('Progress update logged successfully');
            expect(data.success).toBe(true);
        });
    });

    describe('getHistory handler', () => {
        it('returns 400 when teamId path parameter is missing', async () => {
            const res = await getHistory({ pathParameters: {} });
            expect(res.statusCode).toBe(400);
        });

        it('returns 401 when token is missing', async () => {
            const res = await getHistory({ pathParameters: { teamId: 'proj1' } });
            expect(res.statusCode).toBe(401);
        });

        it('returns 404 when project is not found', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'test-secret');
            mockGetUser.mockResolvedValue({ email: 'user@example.com', teamId: 'proj1' });
            mockGetProjectById.mockResolvedValue(null);

            const res = await getHistory({
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj1' }
            });

            expect(res.statusCode).toBe(404);
        });

        it('returns 403 when user is not authorized for target project', async () => {
            const token = jwt.sign({ email: 'unauthorized@example.com' }, 'test-secret');
            mockGetUser.mockResolvedValue({ email: 'unauthorized@example.com', teamId: 'team-b' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', teamEmail: 'owner@example.com', teamId: 'team-a' });

            const res = await getHistory({
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj1' }
            });

            expect(res.statusCode).toBe(403);
        });

        it('returns 200 OK with progress history on success', async () => {
            const token = jwt.sign({ email: 'owner@example.com' }, 'test-secret');
            mockGetUser.mockResolvedValue({ email: 'owner@example.com', teamId: 'proj1' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', teamEmail: 'owner@example.com' });
            const logs = [{ update_text: 'Initial log', delta_percentage: 10 }];
            mockGetProgressLogs.mockResolvedValue(logs);

            const res = await getHistory({
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj1' }
            });

            expect(res.statusCode).toBe(200);
            const data = JSON.parse(res.body);
            expect(data.success).toBe(true);
            expect(data.logs).toEqual(logs);
        });
    });
});
