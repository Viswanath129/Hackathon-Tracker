const mockJwt = {
    verify: jest.fn()
};
const mockProgressService = {
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
};
const mockDynamoService = {
    getUser: jest.fn(),
    getAllUsers: jest.fn(),
    getProjectById: jest.fn()
};

jest.mock('jsonwebtoken', () => mockJwt);
jest.mock('../../services/progressService', () => mockProgressService);
jest.mock('../../services/dynamoService', () => mockDynamoService);

const progressHandler = require('../../handlers/progress');

describe('Progress Lambda Handlers', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: 'testsecret', CORS_ORIGIN: 'http://localhost:5173' };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('logUpdate', () => {
        it('should return 401 if authorization header is missing', async () => {
            const event = { headers: {} };
            const response = await progressHandler.logUpdate(event);
            expect(response.statusCode).toBe(401);
            expect(JSON.parse(response.body)).toEqual({ message: 'Unauthorized' });
        });

        it('should return 400 if request body is missing', async () => {
            mockJwt.verify.mockReturnValue({ email: 'user@example.com' });
            mockDynamoService.getUser.mockResolvedValue({ email: 'user@example.com', _id: 'user1' });

            const event = {
                headers: { authorization: 'Bearer validtoken' }
            };
            const response = await progressHandler.logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body)).toEqual({ message: 'Missing request body' });
        });

        it('should return 400 for invalid deltaPercentage input (e.g. boolean)', async () => {
            mockJwt.verify.mockReturnValue({ email: 'user@example.com' });
            mockDynamoService.getUser.mockResolvedValue({ email: 'user@example.com', _id: 'user1' });

            const event = {
                headers: { authorization: 'Bearer validtoken' },
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Updated UI', deltaPercentage: true })
            };
            const response = await progressHandler.logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body)).toEqual({ message: 'deltaPercentage must be a numeric value' });
        });

        it('should return 404 if project is not found', async () => {
            mockJwt.verify.mockReturnValue({ email: 'user@example.com' });
            mockDynamoService.getUser.mockResolvedValue({ email: 'user@example.com', _id: 'user1' });
            mockDynamoService.getProjectById.mockResolvedValue(null);

            const event = {
                headers: { authorization: 'Bearer validtoken' },
                body: JSON.stringify({ teamId: 'nonexistent', updateText: 'Updated UI', deltaPercentage: 10 })
            };
            const response = await progressHandler.logUpdate(event);
            expect(response.statusCode).toBe(404);
            expect(JSON.parse(response.body)).toEqual({ message: 'Project not found' });
        });

        it('should return 403 if user does not own the project', async () => {
            mockJwt.verify.mockReturnValue({ email: 'user@example.com' });
            mockDynamoService.getUser.mockResolvedValue({ email: 'user@example.com', _id: 'user1', role: 'team' });
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj1', teamId: 'otherUser' });

            const event = {
                headers: { authorization: 'Bearer validtoken' },
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Updated UI', deltaPercentage: 10 })
            };
            const response = await progressHandler.logUpdate(event);
            expect(response.statusCode).toBe(403);
            expect(JSON.parse(response.body)).toEqual({ message: 'Forbidden: You do not own this project' });
        });

        it('should return 201 on successful progress update logging', async () => {
            mockJwt.verify.mockReturnValue({ email: 'user@example.com' });
            mockDynamoService.getUser.mockResolvedValue({ email: 'user@example.com', _id: 'user1' });
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj1', teamId: 'user1' });
            mockProgressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });

            const event = {
                headers: { authorization: 'Bearer validtoken' },
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Updated UI', deltaPercentage: 10 })
            };
            const response = await progressHandler.logUpdate(event);
            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({
                message: 'Progress logged successfully',
                result: { success: true, timestamp: '2026-02-28T00:00:00.000Z' }
            });
        });

        it('should return 200 for OPTIONS preflight request', async () => {
            const event = { httpMethod: 'OPTIONS' };
            const response = await progressHandler.logUpdate(event);
            expect(response.statusCode).toBe(200);
        });
    });

    describe('getHistory', () => {
        it('should return 401 if authorization header is missing', async () => {
            const event = { headers: {}, pathParameters: { teamId: 'proj1' } };
            const response = await progressHandler.getHistory(event);
            expect(response.statusCode).toBe(401);
        });

        it('should return 404 if project is not found', async () => {
            mockJwt.verify.mockReturnValue({ email: 'user@example.com' });
            mockDynamoService.getUser.mockResolvedValue({ email: 'user@example.com', _id: 'user1' });
            mockDynamoService.getProjectById.mockResolvedValue(null);

            const event = {
                headers: { authorization: 'Bearer validtoken' },
                pathParameters: { teamId: 'nonexistent' }
            };
            const response = await progressHandler.getHistory(event);
            expect(response.statusCode).toBe(404);
            expect(JSON.parse(response.body)).toEqual({ message: 'Project not found' });
        });

        it('should return 200 OK with progress history logs', async () => {
            mockJwt.verify.mockReturnValue({ email: 'user@example.com' });
            mockDynamoService.getUser.mockResolvedValue({ email: 'user@example.com', _id: 'user1' });
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj1', teamId: 'user1' });
            const mockLogs = [{ update_text: 'Fixed bug', delta_percentage: 5 }];
            mockProgressService.getProgressLogs.mockResolvedValue(mockLogs);

            const event = {
                headers: { authorization: 'Bearer validtoken' },
                pathParameters: { teamId: 'proj1' }
            };
            const response = await progressHandler.getHistory(event);
            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual({ logs: mockLogs });
        });
    });
});
