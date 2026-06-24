const { logUpdate, getHistory } = require('../../handlers/progress');
const progressService = require('../../services/progressService');

jest.mock('../../services/progressService');

describe('Progress Lambda Handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate', () => {
        it('should return 201 on successful progress log', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'test-team',
                    updateText: 'Step completed',
                    deltaPercentage: 10
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: '2023-01-01T00:00:00Z' });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: '2023-01-01T00:00:00Z' });
            expect(progressService.logProgress).toHaveBeenCalledWith('test-team', 'Step completed', 10);
        });

        it('should handle pre-parsed body object', async () => {
            const event = {
                body: {
                    teamId: 'test-team',
                    updateText: 'Step completed',
                    deltaPercentage: 10
                }
            };

            progressService.logProgress.mockResolvedValue({ success: true });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
        });

        it('should return 400 for invalid JSON body', async () => {
            const event = {
                body: '{ invalid json'
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Invalid JSON');
        });

        it('should return 400 for missing required fields', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'test-team'
                    // missing updateText and deltaPercentage
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('Missing required fields');
        });

        it('should return 400 for invalid deltaPercentage range', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'test-team',
                    updateText: 'Invalid delta',
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('deltaPercentage must be a numeric value between -100 and 100');
        });

        it('should return 500 on service error', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'test-team',
                    updateText: 'Service fail',
                    deltaPercentage: 5
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
                pathParameters: {
                    teamId: 'test-team'
                }
            };

            const mockLogs = [
                { PK: 'PROJ#test-team', SK: 'LOG#1', update_text: 'Log 1' },
                { PK: 'PROJ#test-team', SK: 'LOG#2', update_text: 'Log 2' }
            ];

            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith('test-team');
        });

        it('should return 400 if teamId is missing', async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('teamId path parameter is required');
        });

        it('should return 500 on service error', async () => {
            const event = {
                pathParameters: {
                    teamId: 'test-team'
                }
            };

            progressService.getProgressLogs.mockRejectedValue(new Error('DynamoDB Error'));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });
});
