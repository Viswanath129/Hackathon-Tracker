const { logUpdate, getHistory } = require('./progress');
const { logProgress, getProgressLogs } = require('../services/progressService');

jest.mock('../services/progressService');

describe('Progress Lambda Handlers', () => {
    describe('logUpdate', () => {
        test('should successfully log progress update', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'Completed authentication module',
                    deltaPercentage: 15
                })
            };

            logProgress.mockResolvedValue({ success: true, timestamp: '2023-10-01T12:00:00Z' });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: '2023-10-01T12:00:00Z' });
            expect(logProgress).toHaveBeenCalledWith('team123', 'Completed authentication module', 15);
        });

        test('should return 400 if teamId is missing', async () => {
            const event = {
                body: JSON.stringify({
                    updateText: 'Incomplete request'
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('teamId and updateText are required');
        });

        test('should return 400 for invalid deltaPercentage', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'Invalid delta',
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('deltaPercentage must be a number between 0 and 100');
        });

        test('should return 400 for malformed JSON', async () => {
            const event = {
                body: '{ invalid json }'
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Invalid JSON format');
        });

        test('should return 500 on service failure', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'Error case'
                })
            };

            logProgress.mockRejectedValue(new Error('DynamoDB Error'));

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory', () => {
        test('should successfully retrieve progress logs', async () => {
            const event = {
                pathParameters: { teamId: 'team123' }
            };

            const mockLogs = [
                { PK: 'PROJ#team123', SK: 'LOG#1', update_text: 'Start', delta_percentage: 10 },
                { PK: 'PROJ#team123', SK: 'LOG#2', update_text: 'Mid', delta_percentage: 20 }
            ];

            getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(getProgressLogs).toHaveBeenCalledWith('team123');
        });

        test('should return 400 if teamId is missing in path parameters', async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('teamId is required');
        });

        test('should return 500 on service failure', async () => {
            const event = {
                pathParameters: { teamId: 'team123' }
            };

            getProgressLogs.mockRejectedValue(new Error('Query Error'));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });
});
