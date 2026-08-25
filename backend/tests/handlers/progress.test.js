const jwt = require('jsonwebtoken');

const mockProgressService = {
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
};

const mockDynamoService = {
    getUser: jest.fn(),
    getAllUsers: jest.fn(),
    getProjectById: jest.fn(),
    saveProject: jest.fn()
};

jest.mock('../../services/progressService', () => mockProgressService);
jest.mock('../../services/dynamoService', () => mockDynamoService);

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('progress lambda handlers', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: 'testsecret', CORS_ORIGIN: 'http://localhost:5173' };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('logUpdate handler', () => {
        it('returns 200 for OPTIONS preflight request', async () => {
            const event = { httpMethod: 'OPTIONS' };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(200);
        });

        it('returns 400 if event or body is missing', async () => {
            const response = await logUpdate({});
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Missing request body');
        });

        it('returns 400 if body is invalid JSON', async () => {
            const event = { body: '{invalid-json' };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Invalid JSON payload');
        });

        it('returns 400 if payload validation fails', async () => {
            const event = { body: JSON.stringify({ teamId: '' }) };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('teamId must be a non-empty string');
        });

        it('returns 401 if authentication token is missing', async () => {
            const event = {
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Testing', deltaPercentage: 10 })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(401);
            expect(JSON.parse(response.body).message).toBe('Not authorized, token missing or invalid');
        });

        it('returns 403 if project authorization fails (BOLA)', async () => {
            const token = jwt.sign({ email: 'user@test.com' }, 'testsecret');
            mockDynamoService.getUser.mockResolvedValue({ _id: 'user_1', email: 'user@test.com', role: 'user' });
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj_1', team_id: 'user_other' });

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Testing', deltaPercentage: 10 })
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(403);
            expect(JSON.parse(response.body).message).toBe('Forbidden: You do not have permission to access this project');
        });

        it('returns 201 Created on successful progress logging', async () => {
            const token = jwt.sign({ email: 'user@test.com' }, 'testsecret');
            const mockUser = { _id: 'user_1', email: 'user@test.com', role: 'user' };
            const mockProj = { _id: 'proj_1', team_id: 'user_1', hackathon_id: 'hack_1', progress_percentage: 40 };

            mockDynamoService.getUser.mockResolvedValue(mockUser);
            mockDynamoService.getProjectById.mockResolvedValue(mockProj);
            mockProgressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T12:00:00Z' });

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Sprint complete', deltaPercentage: 20 })
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(201);
            const parsed = JSON.parse(response.body);
            expect(parsed.message).toBe('Progress update logged successfully');
            expect(mockProgressService.logProgress).toHaveBeenCalledWith('proj_1', 'Sprint complete', 20);
            expect(mockDynamoService.saveProject).toHaveBeenCalledWith('hack_1', expect.objectContaining({ progress_percentage: 60 }));
        });
    });

    describe('getHistory handler', () => {
        it('returns 400 if teamId path parameter is missing', async () => {
            const event = { pathParameters: {} };
            const response = await getHistory(event);
            expect(response.statusCode).toBe(400);
        });

        it('returns 200 OK with logs on success', async () => {
            const token = jwt.sign({ email: 'user@test.com' }, 'testsecret');
            const mockUser = { _id: 'user_1', email: 'user@test.com', role: 'user' };
            const mockProj = { _id: 'proj_1', team_id: 'user_1' };
            const mockLogs = [{ update_text: 'Log 1', delta_percentage: 20 }];

            mockDynamoService.getUser.mockResolvedValue(mockUser);
            mockDynamoService.getProjectById.mockResolvedValue(mockProj);
            mockProgressService.getProgressLogs.mockResolvedValue(mockLogs);

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj_1' }
            };

            const response = await getHistory(event);
            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
        });
    });
});
