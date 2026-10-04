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

describe('Lambda Progress Handlers', () => {
    const mockJwtSecret = 'test-secret';
    const mockUser = { teamId: 'team123', email: 'team@example.com', role: 'team' };
    const mockProject = { _id: 'team123', teamId: 'team123', type: 'PROJECT' };
    let validToken;

    beforeEach(() => {
        process.env.JWT_SECRET = mockJwtSecret;
        process.env.CORS_ORIGIN = 'http://localhost:5173';
        jest.clearAllMocks();
        validToken = jwt.sign(mockUser, mockJwtSecret);
    });

    describe('logUpdate handler', () => {
        it('should return 400 if event or body is missing', async () => {
            const res = await logUpdate({});
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body)).toEqual({ message: 'Request body is required' });
        });

        it('should return 400 for invalid JSON body', async () => {
            const res = await logUpdate({ body: '{invalid-json' });
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body)).toEqual({ message: 'Invalid JSON payload' });
        });

        it('should return 401 if authorization header is missing', async () => {
            const event = { body: JSON.stringify({ teamId: 'team123', updateText: 'Step 1', deltaPercentage: 10 }) };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body)).toEqual({ message: 'Unauthorized' });
        });

        it('should return 401 if token is invalid', async () => {
            const event = {
                headers: { authorization: 'Bearer invalid-token' },
                body: JSON.stringify({ teamId: 'team123', updateText: 'Step 1', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body)).toEqual({ message: 'Unauthorized' });
        });

        it('should return 400 if validation fails (e.g. boolean deltaPercentage)', async () => {
            const event = {
                headers: { authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'team123', updateText: 'Step 1', deltaPercentage: true })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('deltaPercentage cannot be a boolean');
        });

        it('should return 404 if project is not found', async () => {
            mockGetProjectById.mockResolvedValue(null);
            const event = {
                headers: { authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'team123', updateText: 'Step 1', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(404);
            expect(JSON.parse(res.body)).toEqual({ message: 'Project not found' });
        });

        it('should return 403 if project ownership check fails', async () => {
            mockGetProjectById.mockResolvedValue({ _id: 'otherTeam', teamId: 'otherTeam' });
            const event = {
                headers: { authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'team123', updateText: 'Step 1', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body)).toEqual({ message: 'Forbidden: Access denied' });
        });

        it('should return 201 Created on successful progress update', async () => {
            mockGetProjectById.mockResolvedValue(mockProject);
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });

            const event = {
                headers: { authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'team123', updateText: 'Milestone reached', deltaPercentage: 25 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            const body = JSON.parse(res.body);
            expect(body.message).toBe('Progress update logged successfully');
            expect(body.data.success).toBe(true);
        });

        it('should return 500 on internal service failure', async () => {
            mockGetProjectById.mockRejectedValue(new Error('DynamoDB Error'));

            const event = {
                headers: { authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'team123', updateText: 'Error test', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body)).toEqual({ message: 'Internal Server Error' });
        });
    });

    describe('getHistory handler', () => {
        it('should return 401 if unauthenticated', async () => {
            const res = await getHistory({ pathParameters: { teamId: 'team123' } });
            expect(res.statusCode).toBe(401);
        });

        it('should return 400 if teamId path parameter is missing', async () => {
            const event = { headers: { authorization: `Bearer ${validToken}` }, pathParameters: {} };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(400);
        });

        it('should return 404 if project is not found', async () => {
            mockGetProjectById.mockResolvedValue(null);
            const event = {
                headers: { authorization: `Bearer ${validToken}` },
                pathParameters: { teamId: 'team123' }
            };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(404);
        });

        it('should return 403 if project ownership check fails', async () => {
            mockGetProjectById.mockResolvedValue({ _id: 'otherTeam', teamId: 'otherTeam' });
            const event = {
                headers: { authorization: `Bearer ${validToken}` },
                pathParameters: { teamId: 'team123' }
            };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(403);
        });

        it('should return 200 OK with progress history', async () => {
            mockGetProjectById.mockResolvedValue(mockProject);
            mockGetProgressLogs.mockResolvedValue([
                { timestamp: '2026-02-28T00:00:00.000Z', update_text: 'Update 1', delta_percentage: 15 }
            ]);

            const event = {
                headers: { authorization: `Bearer ${validToken}` },
                pathParameters: { teamId: 'team123' }
            };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.message).toBe('Progress logs retrieved successfully');
            expect(body.data.length).toBe(1);
        });
    });
});
