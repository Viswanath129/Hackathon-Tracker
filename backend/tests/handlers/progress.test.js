const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockCheckProjectOwnership = jest.fn();
const mockAuthenticateEvent = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args),
}));

jest.mock('../../utils/auth', () => ({
    checkProjectOwnership: (...args) => mockCheckProjectOwnership(...args),
}));

jest.mock('../../handlers/utils', () => {
    const originalUtils = jest.requireActual('../../handlers/utils');
    return {
        ...originalUtils,
        authenticateEvent: (...args) => mockAuthenticateEvent(...args),
    };
});

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Progress Handler (Lambda)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate', () => {
        it('should handle OPTIONS preflight request', async () => {
            const event = { httpMethod: 'OPTIONS' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body)).toEqual({ message: 'OK' });
        });

        it('should return 401 if user authentication fails', async () => {
            mockAuthenticateEvent.mockResolvedValue(null);
            const event = { httpMethod: 'POST', body: JSON.stringify({ teamId: 'p1' }) };

            const res = await logUpdate(event);

            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body)).toEqual({ message: 'Unauthorized' });
        });

        it('should return 400 if request body is missing', async () => {
            mockAuthenticateEvent.mockResolvedValue({ _id: 'u1', email: 'u1@test.com' });
            const event = { httpMethod: 'POST', body: null };

            const res = await logUpdate(event);

            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body)).toEqual({ message: 'Missing request body' });
        });

        it('should return 400 if JSON parsing fails', async () => {
            mockAuthenticateEvent.mockResolvedValue({ _id: 'u1', email: 'u1@test.com' });
            const event = { httpMethod: 'POST', body: 'invalid json {' };

            const res = await logUpdate(event);

            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body)).toEqual({ message: 'Invalid JSON payload' });
        });

        it('should return 400 for validation errors (e.g. invalid deltaPercentage)', async () => {
            mockAuthenticateEvent.mockResolvedValue({ _id: 'u1', email: 'u1@test.com' });
            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'p1', updateText: 'test', deltaPercentage: 'invalid' }),
            };

            const res = await logUpdate(event);

            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBeDefined();
        });

        it('should return 403 if project ownership check fails (BOLA)', async () => {
            mockAuthenticateEvent.mockResolvedValue({ _id: 'u1', email: 'u1@test.com' });
            mockCheckProjectOwnership.mockResolvedValue(false);
            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'p1', updateText: 'Valid update', deltaPercentage: 10 }),
            };

            const res = await logUpdate(event);

            expect(mockCheckProjectOwnership).toHaveBeenCalledWith({ _id: 'u1', email: 'u1@test.com' }, 'p1');
            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body)).toEqual({ message: 'Forbidden: Access denied to this project' });
        });

        it('should return 201 Created on successful progress logging', async () => {
            mockAuthenticateEvent.mockResolvedValue({ _id: 'u1', email: 'u1@test.com' });
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T12:00:00.000Z' });

            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'p1', updateText: 'Implemented Lambda', deltaPercentage: 20 }),
            };

            const res = await logUpdate(event);

            expect(mockCheckProjectOwnership).toHaveBeenCalledWith({ _id: 'u1', email: 'u1@test.com' }, 'p1');
            expect(mockLogProgress).toHaveBeenCalledWith('p1', 'Implemented Lambda', 20);
            expect(res.statusCode).toBe(201);
            expect(JSON.parse(res.body)).toEqual({
                message: 'Progress update logged successfully',
                timestamp: '2026-03-01T12:00:00.000Z',
            });
        });

        it('should return generic 500 Internal Server Error on unhandled error', async () => {
            mockAuthenticateEvent.mockResolvedValue({ _id: 'u1', email: 'u1@test.com' });
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockRejectedValue(new Error('DynamoDB Connection Lost'));

            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'p1', updateText: 'Implemented Lambda', deltaPercentage: 20 }),
            };

            const res = await logUpdate(event);

            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body)).toEqual({ message: 'Internal Server Error' });
        });
    });

    describe('getHistory', () => {
        it('should handle OPTIONS preflight request', async () => {
            const event = { httpMethod: 'OPTIONS' };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body)).toEqual({ message: 'OK' });
        });

        it('should return 401 if user authentication fails', async () => {
            mockAuthenticateEvent.mockResolvedValue(null);
            const event = { httpMethod: 'GET', pathParameters: { teamId: 'p1' } };

            const res = await getHistory(event);

            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body)).toEqual({ message: 'Unauthorized' });
        });

        it('should return 400 if teamId is missing in pathParameters', async () => {
            mockAuthenticateEvent.mockResolvedValue({ _id: 'u1', email: 'u1@test.com' });
            const event = { httpMethod: 'GET', pathParameters: null };

            const res = await getHistory(event);

            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body)).toEqual({ message: 'teamId parameter is required' });
        });

        it('should return 403 if project ownership check fails (BOLA)', async () => {
            mockAuthenticateEvent.mockResolvedValue({ _id: 'u1', email: 'u1@test.com' });
            mockCheckProjectOwnership.mockResolvedValue(false);
            const event = { httpMethod: 'GET', pathParameters: { teamId: 'p1' } };

            const res = await getHistory(event);

            expect(mockCheckProjectOwnership).toHaveBeenCalledWith({ _id: 'u1', email: 'u1@test.com' }, 'p1');
            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body)).toEqual({ message: 'Forbidden: Access denied to this project' });
        });

        it('should return 200 OK with history logs on success', async () => {
            mockAuthenticateEvent.mockResolvedValue({ _id: 'u1', email: 'u1@test.com' });
            mockCheckProjectOwnership.mockResolvedValue(true);
            const mockLogs = [{ SK: 'LOG#123', update_text: 'Log entry 1', delta_percentage: 15 }];
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            const event = { httpMethod: 'GET', pathParameters: { teamId: 'p1' } };

            const res = await getHistory(event);

            expect(mockCheckProjectOwnership).toHaveBeenCalledWith({ _id: 'u1', email: 'u1@test.com' }, 'p1');
            expect(mockGetProgressLogs).toHaveBeenCalledWith('p1');
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body)).toEqual(mockLogs);
        });

        it('should return 500 on internal service error', async () => {
            mockAuthenticateEvent.mockResolvedValue({ _id: 'u1', email: 'u1@test.com' });
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockGetProgressLogs.mockRejectedValue(new Error('Internal error'));

            const event = { httpMethod: 'GET', pathParameters: { teamId: 'p1' } };

            const res = await getHistory(event);

            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body)).toEqual({ message: 'Internal Server Error' });
        });
    });
});
