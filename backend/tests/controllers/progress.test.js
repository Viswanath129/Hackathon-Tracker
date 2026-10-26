const request = require('supertest');
const jwt = require('jsonwebtoken');

const mockGetUser = jest.fn();
const mockGetAllUsers = jest.fn();
const mockGetProjectById = jest.fn();
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock('../../services/dynamoService', () => ({
    getUser: mockGetUser,
    getAllUsers: mockGetAllUsers,
    getProjectById: mockGetProjectById
}));

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

const app = require('../../server');

describe('Express Progress Controller & Routes', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: 'testsecret' };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('POST /api/progress/update', () => {
        it('returns 401 when no authorization header is provided', async () => {
            const res = await request(app)
                .post('/api/progress/update')
                .send({ teamId: 'proj1', updateText: 'Testing', deltaPercentage: 10 });
            expect(res.status).toBe(401);
        });

        it('returns 400 when deltaPercentage is a boolean', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ email: 'user@example.com', role: 'user', teamId: 'proj1' });

            const res = await request(app)
                .post('/api/progress/update')
                .set('Authorization', `Bearer ${token}`)
                .send({ teamId: 'proj1', updateText: 'Testing', deltaPercentage: false });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('deltaPercentage must be a number');
        });

        it('returns 404 when project does not exist', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ email: 'user@example.com', role: 'user', teamId: 'proj1' });
            mockGetProjectById.mockResolvedValue(null);

            const res = await request(app)
                .post('/api/progress/update')
                .set('Authorization', `Bearer ${token}`)
                .send({ teamId: 'nonexistent', updateText: 'Testing', deltaPercentage: 10 });

            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Project not found');
        });

        it('returns 403 when user does not own project (BOLA check)', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ email: 'user@example.com', role: 'user', teamId: 'proj1' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj2', teamId: 'proj2', email: 'other@example.com' });

            const res = await request(app)
                .post('/api/progress/update')
                .set('Authorization', `Bearer ${token}`)
                .send({ teamId: 'proj2', updateText: 'Testing', deltaPercentage: 10 });

            expect(res.status).toBe(403);
            expect(res.body.message).toContain('Forbidden');
        });

        it('returns 201 Created on valid progress update', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ email: 'user@example.com', role: 'user', teamId: 'proj1' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', teamId: 'proj1', email: 'user@example.com' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });

            const res = await request(app)
                .post('/api/progress/update')
                .set('Authorization', `Bearer ${token}`)
                .send({ teamId: 'proj1', updateText: 'Testing update', deltaPercentage: 20 });

            expect(res.status).toBe(201);
            expect(res.body.message).toBe('Progress update logged successfully');
            expect(res.body.data).toEqual({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });
        });
    });

    describe('GET /api/progress/:teamId', () => {
        it('returns 401 when no authorization token', async () => {
            const res = await request(app).get('/api/progress/proj1');
            expect(res.status).toBe(401);
        });

        it('returns 404 when project is not found', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ email: 'user@example.com', role: 'user', teamId: 'proj1' });
            mockGetProjectById.mockResolvedValue(null);

            const res = await request(app)
                .get('/api/progress/nonexistent')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Project not found');
        });

        it('returns 200 OK with progress history logs', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ email: 'user@example.com', role: 'user', teamId: 'proj1' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', teamId: 'proj1', email: 'user@example.com' });
            const logsMock = [{ update_text: 'Log 1', delta_percentage: 15, timestamp: '2026-02-28T00:00:00.000Z' }];
            mockGetProgressLogs.mockResolvedValue(logsMock);

            const res = await request(app)
                .get('/api/progress/proj1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Progress history retrieved successfully');
            expect(res.body.logs).toEqual(logsMock);
        });
    });
});
