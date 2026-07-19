// Mock the services before requiring anything
jest.mock('../../services/progressService', () => ({
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
}));

const { logProgress, getProgressLogs } = require('../../services/progressService');
const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Lambda Progress Handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate', () => {
        it('should return 400 Bad Request if request body is missing', async () => {
            const event = {}; // no body
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body)).toEqual({ message: 'Request body is missing' });
        });

        it('should return 400 Bad Request if JSON parsing fails', async () => {
            const event = { body: 'invalid-json' };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body)).toEqual({ message: 'Invalid JSON request body' });
        });

        it('should return 400 Bad Request if validation fails (e.g. invalid deltaPercentage)', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team-123',
                    updateText: 'Completed setup',
                    deltaPercentage: 200 // > 100
                })
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).message).toBe('Validation Failed');
            expect(JSON.parse(result.body).errors).toContain('deltaPercentage must be a numeric value between -100 and 100');
        });

        it('should return 201 Created and log progress successfully', async () => {
            logProgress.mockResolvedValue({ success: true, timestamp: '2026-07-19T20:00:00.000Z' });

            const event = {
                body: JSON.stringify({
                    teamId: 'team-123',
                    updateText: 'Completed setup',
                    deltaPercentage: 20
                })
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(201);
            expect(JSON.parse(result.body)).toEqual({ success: true, timestamp: '2026-07-19T20:00:00.000Z' });
            expect(logProgress).toHaveBeenCalledWith('team-123', 'Completed setup', 20);
        });

        it('should return 500 on internal service failure', async () => {
            logProgress.mockRejectedValue(new Error('DynamoDB Error'));

            const event = {
                body: JSON.stringify({
                    teamId: 'team-123',
                    updateText: 'Completed setup',
                    deltaPercentage: 20
                })
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(500);
            expect(JSON.parse(result.body)).toEqual({ message: 'Internal Server Error' });
        });
    });

    describe('getHistory', () => {
        it('should return 400 Bad Request if teamId path parameter is missing', async () => {
            const event = { pathParameters: null };
            const result = await getHistory(event);
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body)).toEqual({ message: 'teamId parameter is required' });
        });

        it('should return 200 OK and list of history logs on success', async () => {
            const mockLogs = [
                { PK: 'PROJ#team-123', SK: 'LOG#1', update_text: 'Start', delta_percentage: 10 }
            ];
            getProgressLogs.mockResolvedValue(mockLogs);

            const event = { pathParameters: { teamId: 'team-123' } };
            const result = await getHistory(event);
            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body)).toEqual(mockLogs);
            expect(getProgressLogs).toHaveBeenCalledWith('team-123');
        });

        it('should return 500 on internal service failure', async () => {
            getProgressLogs.mockRejectedValue(new Error('DynamoDB Error'));

            const event = { pathParameters: { teamId: 'team-123' } };
            const result = await getHistory(event);
            expect(result.statusCode).toBe(500);
            expect(JSON.parse(result.body)).toEqual({ message: 'Internal Server Error' });
        });
    });
});
