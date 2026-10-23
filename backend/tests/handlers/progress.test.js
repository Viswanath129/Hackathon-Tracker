const jwt = require('jsonwebtoken');

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

describe('Lambda Handler: progress', () => {
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
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(401);
            expect(JSON.parse(result.body)).toEqual({ message: 'Not authorized, token failed' });
        });

        it('should return 401 if token verification fails', async () => {
            const event = { headers: { authorization: 'Bearer invalidtoken' } };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(401);
            expect(JSON.parse(result.body)).toEqual({ message: 'Not authorized, token failed' });
        });

        it('should return 400 if body is missing', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ _id: 'user1', email: 'user@example.com' });

            const event = {
                headers: { authorization: `Bearer ${token}` }
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body)).toEqual({ message: 'Request body is required' });
        });

        it('should return 400 if body is invalid JSON string', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ _id: 'user1', email: 'user@example.com' });

            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: '{invalid json'
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body)).toEqual({ message: 'Invalid JSON payload' });
        });

        it('should return 400 if deltaPercentage is a boolean', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ _id: 'user1', email: 'user@example.com' });

            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Doing work', deltaPercentage: true })
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body)).toEqual({ message: 'deltaPercentage must be a number between -100 and 100' });
        });

        it('should return 404 if project is not found', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ _id: 'user1', email: 'user@example.com' });
            mockGetProjectById.mockResolvedValue(null);

            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Doing work', deltaPercentage: 10 })
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(404);
            expect(JSON.parse(result.body)).toEqual({ message: 'Project not found' });
        });

        it('should return 403 if user is not authorized for the project (BOLA)', async () => {
            const token = jwt.sign({ email: 'other@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ _id: 'user2', email: 'other@example.com' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', email: 'user@example.com', PK: 'USER#user@example.com' });

            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Doing work', deltaPercentage: 10 })
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(403);
            expect(JSON.parse(result.body)).toEqual({ message: 'Forbidden: Not authorized to update this project' });
        });

        it('should return 201 on successful update', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ _id: 'user1', email: 'user@example.com' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', email: 'user@example.com', PK: 'USER#user@example.com' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-10-23T00:00:00.000Z' });

            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Doing work', deltaPercentage: 10 })
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(201);
            expect(JSON.parse(result.body)).toEqual({
                message: 'Progress log created successfully',
                log: { success: true, timestamp: '2026-10-23T00:00:00.000Z' }
            });
        });

        it('should return 500 on unexpected service exception', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ _id: 'user1', email: 'user@example.com' });
            mockGetProjectById.mockRejectedValue(new Error('DynamoDB Error'));

            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Doing work', deltaPercentage: 10 })
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(500);
            expect(JSON.parse(result.body)).toEqual({ message: 'Internal Server Error' });
        });
    });

    describe('getHistory', () => {
        it('should return 400 if teamId path parameter is missing', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ _id: 'user1', email: 'user@example.com' });

            const event = {
                headers: { authorization: `Bearer ${token}` },
                pathParameters: {}
            };
            const result = await getHistory(event);
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body)).toEqual({ message: 'teamId parameter is required' });
        });

        it('should return 200 with logs on success', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ _id: 'user1', email: 'user@example.com' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', email: 'user@example.com', PK: 'USER#user@example.com' });
            mockGetProgressLogs.mockResolvedValue([{ update_text: 'Done', delta_percentage: 20 }]);

            const event = {
                headers: { authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj1' }
            };
            const result = await getHistory(event);
            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body)).toEqual({
                success: true,
                data: [{ update_text: 'Done', delta_percentage: 20 }]
            });
        });
    });
});
