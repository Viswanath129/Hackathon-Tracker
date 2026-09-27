const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockGetProjectById = jest.fn();
const mockVerifyToken = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

jest.mock('../../services/dynamoService', () => ({
    getProjectById: mockGetProjectById
}));

jest.mock('../../utils/auth', () => {
    const originalAuth = jest.requireActual('../../utils/auth');
    return {
        ...originalAuth,
        verifyToken: mockVerifyToken
    };
});

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('progress Lambda handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate handler', () => {
        test('should return 200 for OPTIONS preflight request', async () => {
            const event = { httpMethod: 'OPTIONS' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(200);
        });

        test('should return 401 if unauthorized (no token / invalid token)', async () => {
            mockVerifyToken.mockReturnValue(null);
            const event = {
                httpMethod: 'POST',
                headers: {}
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
        });

        test('should return 400 if event body is invalid JSON', async () => {
            mockVerifyToken.mockReturnValue({ teamId: 'team_1', role: 'user' });
            const event = {
                httpMethod: 'POST',
                headers: { Authorization: 'Bearer valid_token' },
                body: 'invalid-json'
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
        });

        test('should return 404 if project is not found', async () => {
            mockVerifyToken.mockReturnValue({ teamId: 'team_1', role: 'user' });
            mockGetProjectById.mockResolvedValue(null);

            const event = {
                httpMethod: 'POST',
                headers: { Authorization: 'Bearer valid_token' },
                body: JSON.stringify({ teamId: 'proj_unknown', updateText: 'Testing', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(404);
        });

        test('should return 403 if project ownership check fails', async () => {
            mockVerifyToken.mockReturnValue({ teamId: 'team_1', role: 'user' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj_other', teamId: 'team_2' });

            const event = {
                httpMethod: 'POST',
                headers: { Authorization: 'Bearer valid_token' },
                body: JSON.stringify({ teamId: 'proj_other', updateText: 'Testing', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
        });

        test('should return 201 on successful progress logging', async () => {
            mockVerifyToken.mockReturnValue({ teamId: 'team_1', role: 'user' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj_100', teamId: 'team_1' });
            mockLogProgress.mockResolvedValue({ timestamp: '2026-03-01T00:00:00Z' });

            const event = {
                httpMethod: 'POST',
                headers: { Authorization: 'Bearer valid_token' },
                body: JSON.stringify({ teamId: 'proj_100', updateText: 'Fixed bug', deltaPercentage: 20 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            const parsedBody = JSON.parse(res.body);
            expect(parsedBody.message).toBe('Progress update logged successfully');
            expect(parsedBody.projectId).toBe('proj_100');
        });
    });

    describe('getHistory handler', () => {
        test('should return 401 if no valid user in request', async () => {
            mockVerifyToken.mockReturnValue(null);
            const event = { httpMethod: 'GET', pathParameters: { teamId: 'proj_100' } };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(401);
        });

        test('should return 200 with logs on success', async () => {
            mockVerifyToken.mockReturnValue({ teamId: 'team_1' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj_100', teamId: 'team_1' });
            mockGetProgressLogs.mockResolvedValue([{ update_text: 'Done', delta_percentage: 50 }]);

            const event = {
                httpMethod: 'GET',
                headers: { Authorization: 'Bearer valid_token' },
                pathParameters: { teamId: 'proj_100' }
            };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.projectId).toBe('proj_100');
            expect(body.logs.length).toBe(1);
        });
    });
});
