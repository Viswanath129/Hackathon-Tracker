const { logUpdate, getHistory } = require('../../handlers/progress');
const { logProgress, getProgressLogs } = require('../../services/progressService');

jest.mock('../../services/progressService');

describe('Progress Lambda Handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate', () => {
        it('should log progress successfully with a valid body', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'Started working on the UI',
                    deltaPercentage: 10
                })
            };

            logProgress.mockResolvedValue({ success: true, timestamp: '2023-10-01T12:00:00Z' });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: '2023-10-01T12:00:00Z' });
            expect(logProgress).toHaveBeenCalledWith('team123', 'Started working on the UI', 10);
        });

        it('should handle pre-parsed body objects', async () => {
            const event = {
                body: {
                    teamId: 'team123',
                    updateText: 'Task completed',
                    deltaPercentage: 20
                }
            };

            logProgress.mockResolvedValue({ success: true });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(logProgress).toHaveBeenCalled();
        });

        it('should return 400 if required fields are missing', async () => {
            const event = {
                body: JSON.stringify({ teamId: 'team123' })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('Missing required fields');
        });

        it('should return 400 for invalid deltaPercentage', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'Invalid progress',
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('deltaPercentage must be a number between 0 and 100');
        });

        it('should return 400 for malformed JSON', async () => {
            const event = {
                body: '{ invalid json }'
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Invalid JSON body');
        });

        it('should return 500 on service error', async () => {
            const event = {
                body: JSON.stringify({ teamId: 'team123', updateText: 'Testing error' })
            };

            logProgress.mockRejectedValue(new Error('DynamoDB Error'));

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory', () => {
        it('should fetch history successfully for a valid teamId', async () => {
            const event = {
                pathParameters: { teamId: 'team123' }
            };

            const mockLogs = [
                { PK: 'PROJ#team123', SK: 'LOG#1', update_text: 'Log 1' },
                { PK: 'PROJ#team123', SK: 'LOG#2', update_text: 'Log 2' }
            ];

            getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(getProgressLogs).toHaveBeenCalledWith('team123');
        });

        it('should return 400 if teamId is missing', async () => {
            const event = { pathParameters: {} };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('teamId is required');
        });

        it('should return 500 on service error', async () => {
            const event = {
                pathParameters: { teamId: 'team123' }
            };

            getProgressLogs.mockRejectedValue(new Error('Query failed'));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });
});
