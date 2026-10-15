const mockGetProjectById = jest.fn();
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock('../../services/dynamoService', () => ({
    getProjectById: mockGetProjectById
}));

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

const jwt = require('jsonwebtoken');
const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Lambda Handlers - progress.js', () => {
    const originalEnv = process.env;
    const token = jwt.sign({ email: 'user@test.com', teamId: 'team1' }, 'testsecret');

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv, JWT_SECRET: 'testsecret', CORS_ORIGIN: 'http://localhost:5173' };
        mockGetProjectById.mockReset();
        mockLogProgress.mockReset();
        mockGetProgressLogs.mockReset();
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('logUpdate handler', () => {
        it('should return 401 Unauthorized when authorization token is missing or invalid', async () => {
            const noAuthEvent = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'team1', updateText: 'valid', deltaPercentage: 10 })
            };
            const res = await logUpdate(noAuthEvent);
            expect(res.statusCode).toBe(401);
        });

        it('should return 400 Bad Request when body is missing or invalid JSON', async () => {
            const noBodyEvent = {
                httpMethod: 'POST',
                headers: { authorization: `Bearer ${token}` }
            };
            const res1 = await logUpdate(noBodyEvent);
            expect(res1.statusCode).toBe(400);

            const invalidJsonEvent = {
                httpMethod: 'POST',
                headers: { authorization: `Bearer ${token}` },
                body: 'invalid json'
            };
            const res2 = await logUpdate(invalidJsonEvent);
            expect(res2.statusCode).toBe(400);
        });

        it('should return 400 Bad Request when input validation fails', async () => {
            const invalidInputEvent = {
                httpMethod: 'POST',
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: '', updateText: 'valid', deltaPercentage: 10 })
            };
            const res = await logUpdate(invalidInputEvent);
            expect(res.statusCode).toBe(400);
        });

        it('should return 404 Not Found when project does not exist', async () => {
            mockGetProjectById.mockResolvedValueOnce(null);

            const validEvent = {
                httpMethod: 'POST',
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'team1', updateText: 'Log update', deltaPercentage: 15 })
            };

            const res = await logUpdate(validEvent);
            expect(res.statusCode).toBe(404);
            expect(JSON.parse(res.body).message).toBe('Project not found');
        });

        it('should return 201 Created on successful progress update log', async () => {
            const mockProject = { _id: 'proj1', teamId: 'team1', PK: 'HACK#h1', SK: 'PROJ#proj1' };
            mockGetProjectById.mockResolvedValueOnce(mockProject);
            mockLogProgress.mockResolvedValueOnce({ success: true });

            const validEvent = {
                httpMethod: 'POST',
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'team1', updateText: 'Log update', deltaPercentage: 15 })
            };

            const res = await logUpdate(validEvent);
            expect(res.statusCode).toBe(201);
            expect(JSON.parse(res.body).message).toBe('Progress logged successfully');
            expect(res.headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
        });

        it('should return 500 Internal Server Error when an unexpected exception occurs', async () => {
            mockGetProjectById.mockRejectedValueOnce(new Error('DynamoDB Error'));

            const validEvent = {
                httpMethod: 'POST',
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'team1', updateText: 'Log update', deltaPercentage: 15 })
            };

            const res = await logUpdate(validEvent);
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory handler', () => {
        it('should return 401 Unauthorized if auth token is missing or invalid', async () => {
            const eventNoAuth = {
                httpMethod: 'GET',
                pathParameters: { teamId: 'proj1' }
            };
            const res = await getHistory(eventNoAuth);
            expect(res.statusCode).toBe(401);
        });

        it('should return 404 Not Found if project does not exist', async () => {
            mockGetProjectById.mockResolvedValueOnce(null);

            const event = {
                httpMethod: 'GET',
                headers: { authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'team1' }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(404);
            expect(JSON.parse(res.body).message).toBe('Project not found');
        });

        it('should return 200 OK with progress logs for authorized user', async () => {
            const mockProject = { teamId: 'team1', PK: 'HACK#h1', SK: 'PROJ#proj1' };
            const mockLogs = [{ update_text: 'Done step 1', delta_percentage: 10 }];

            mockGetProjectById.mockResolvedValueOnce(mockProject);
            mockGetProgressLogs.mockResolvedValueOnce(mockLogs);

            const event = {
                httpMethod: 'GET',
                headers: { authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'team1' }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body).logs).toEqual(mockLogs);
        });
    });
});
