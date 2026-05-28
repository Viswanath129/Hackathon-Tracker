const { logUpdate, getHistory } = require('./progress');
const progressService = require('../services/progressService');

jest.mock('../services/progressService');

describe('Progress Lambda Handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate handler', () => {
        test('should return 201 on successful progress log', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'Completed module A',
                    deltaPercentage: 15
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: '2023-10-27T10:00:00Z' });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: '2023-10-27T10:00:00Z' });
            expect(progressService.logProgress).toHaveBeenCalledWith('team123', 'Completed module A', 15);
        });

        test('should handle pre-parsed object in event body', async () => {
            const event = {
                body: {
                    teamId: 'team123',
                    updateText: 'Completed module A',
                    deltaPercentage: 15
                }
            };

            progressService.logProgress.mockResolvedValue({ success: true });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(progressService.logProgress).toHaveBeenCalledWith('team123', 'Completed module A', 15);
        });

        test('should return 400 for malformed JSON body', async () => {
            const event = {
                body: '{ invalid json }'
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Invalid JSON in request body');
        });

        test('should return 400 if teamId is missing', async () => {
            const event = {
                body: JSON.stringify({
                    updateText: 'Completed module A'
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('Missing required fields');
        });

        test('should return 400 if deltaPercentage is invalid', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'Completed module A',
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('deltaPercentage must be a number between 0 and 100');
        });

        test('should return 500 if service throws an error', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'Completed module A'
                })
            };

            progressService.logProgress.mockRejectedValue(new Error('DynamoDB Error'));

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory handler', () => {
        test('should return 200 and logs on success', async () => {
            const event = {
                pathParameters: { teamId: 'team123' }
            };

            const mockLogs = [
                { PK: 'PROJ#team123', SK: 'LOG#1', update_text: 'Log 1' },
                { PK: 'PROJ#team123', SK: 'LOG#2', update_text: 'Log 2' }
            ];

            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith('team123');
        });

        test('should return 400 if teamId path parameter is missing', async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Missing teamId parameter');
        });

        test('should return 500 if service throws an error', async () => {
            const event = {
                pathParameters: { teamId: 'team123' }
            };

            progressService.getProgressLogs.mockRejectedValue(new Error('Query Error'));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });
});
