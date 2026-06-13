const progressService = require('../../services/progressService');
const { logUpdate, getHistory } = require('../../handlers/progress');

jest.mock('../../services/progressService');

describe('Progress Handlers', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate', () => {
        it('should return 201 on successful progress log', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'Completed module A',
                    deltaPercentage: 10
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: '2023-10-01T12:00:00Z' });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: '2023-10-01T12:00:00Z' });
            expect(progressService.logProgress).toHaveBeenCalledWith('team123', 'Completed module A', 10);
        });

        it('should handle pre-parsed object body', async () => {
            const event = {
                body: {
                    teamId: 'team123',
                    updateText: 'Completed module A',
                    deltaPercentage: '10'
                }
            };

            progressService.logProgress.mockResolvedValue({ success: true });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(progressService.logProgress).toHaveBeenCalledWith('team123', 'Completed module A', 10);
        });

        it('should return 400 for invalid JSON', async () => {
            const event = { body: '{ invalid json' };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Invalid JSON body');
        });

        it('should return 400 for missing fields', async () => {
            const event = { body: JSON.stringify({ teamId: 'team123' }) };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('Missing required fields');
        });

        it('should return 400 for invalid deltaPercentage', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'text',
                    deltaPercentage: 150
                })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('deltaPercentage must be a number between 0 and 100');
        });

        it('should return 500 on service failure', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'text',
                    deltaPercentage: 10
                })
            };
            progressService.logProgress.mockRejectedValue(new Error('DynamoDB Error'));

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory', () => {
        it('should return 200 and logs for valid teamId', async () => {
            const event = {
                pathParameters: { teamId: 'team123' }
            };
            const mockLogs = [{ PK: 'PROJ#team123', SK: 'LOG#1', update_text: 'Test' }];
            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith('team123');
        });

        it('should return 400 if teamId is missing', async () => {
            const event = { pathParameters: {} };
            const response = await getHistory(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Missing teamId in path');
        });

        it('should return 500 on service failure', async () => {
            const event = { pathParameters: { teamId: 'team123' } };
            progressService.getProgressLogs.mockRejectedValue(new Error('DynamoDB Error'));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });
});
