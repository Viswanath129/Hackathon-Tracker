const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockGetProjectById = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

jest.mock('../../services/dynamoService', () => ({
    getProjectById: mockGetProjectById,
    getUser: jest.fn()
}));

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Progress Lambda Handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate', () => {
        test('returns 400 when event body is missing', async () => {
            const res = await logUpdate({});
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Request body is required');
        });

        test('returns 400 when deltaPercentage is a boolean', async () => {
            const res = await logUpdate({
                body: JSON.stringify({
                    teamId: 'proj_123',
                    updateText: 'Implemented auth',
                    deltaPercentage: true
                })
            });
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('deltaPercentage cannot be a boolean');
        });

        test('returns 401 when effectiveUser is missing', async () => {
            const res = await logUpdate({
                body: JSON.stringify({
                    teamId: 'proj_123',
                    updateText: 'Completed module API',
                    deltaPercentage: 25
                })
            });
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body).message).toBe('Unauthorized: Missing or invalid token');
        });

        test('returns 201 Created on valid progress update log with authorizer claims', async () => {
            mockLogProgress.mockResolvedValueOnce({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });
            mockGetProjectById.mockResolvedValueOnce({ _id: 'proj_123', team_id: 'user_1' });

            const res = await logUpdate({
                body: JSON.stringify({
                    teamId: 'proj_123',
                    updateText: 'Completed module API',
                    deltaPercentage: 25
                }),
                requestContext: {
                    authorizer: {
                        claims: { email: 'user@example.com', sub: 'user_1' }
                    }
                }
            });

            expect(res.statusCode).toBe(201);
            const body = JSON.parse(res.body);
            expect(body.message).toBe('Progress update logged successfully');
            expect(mockLogProgress).toHaveBeenCalledWith('proj_123', 'Completed module API', 25);
        });

        test('returns 500 when progressService throws an unhandled error', async () => {
            mockGetProjectById.mockResolvedValueOnce({ _id: 'proj_123', team_id: 'user_1' });
            mockLogProgress.mockRejectedValueOnce(new Error('DynamoDB Error'));

            const res = await logUpdate({
                body: JSON.stringify({
                    teamId: 'proj_123',
                    updateText: 'Update feature',
                    deltaPercentage: 10
                }),
                requestContext: {
                    authorizer: {
                        claims: { email: 'user@example.com', sub: 'user_1' }
                    }
                }
            });

            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory', () => {
        test('returns 400 when teamId is missing in pathParameters', async () => {
            const res = await getHistory({ pathParameters: {} });
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('teamId path parameter is required');
        });

        test('returns 401 when effectiveUser is missing', async () => {
            const res = await getHistory({
                pathParameters: { teamId: 'proj_123' }
            });
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body).message).toBe('Unauthorized: Missing or invalid token');
        });

        test('returns 200 OK and logs on success with claims', async () => {
            const mockLogs = [
                { PK: 'PROJ#proj_123', SK: 'LOG#2026-03-01', update_text: 'Update 1', delta_percentage: 15 }
            ];
            mockGetProjectById.mockResolvedValueOnce({ _id: 'proj_123', team_id: 'user_1' });
            mockGetProgressLogs.mockResolvedValueOnce(mockLogs);

            const res = await getHistory({
                pathParameters: { teamId: 'proj_123' },
                requestContext: {
                    authorizer: {
                        claims: { email: 'user@example.com', sub: 'user_1' }
                    }
                }
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.data).toEqual(mockLogs);
            expect(mockGetProgressLogs).toHaveBeenCalledWith('proj_123');
        });
    });
});
