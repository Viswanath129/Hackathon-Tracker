const { logUpdate, getHistory } = require('../handlers/progress');
const { logProgress, getProgressLogs } = require('../services/progressService');

// Mock progressService
jest.mock('../services/progressService');

describe('Progress Lambda Handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate handler', () => {
        test('should successfully log progress with valid input', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'PROJ123',
                    updateText: 'Frontend initial setup',
                    deltaPercentage: 10
                })
            };

            logProgress.mockResolvedValue({ success: true, timestamp: '2023-01-01T00:00:00Z' });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: '2023-01-01T00:00:00Z' });
            expect(logProgress).toHaveBeenCalledWith('PROJ123', 'Frontend initial setup', 10);
        });

        test('should return 400 for missing teamId or updateText', async () => {
            const event = {
                body: JSON.stringify({
                    updateText: 'No teamId here'
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('required');
            expect(logProgress).not.toHaveBeenCalled();
        });

        test('should return 400 for invalid deltaPercentage (too high)', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'PROJ123',
                    updateText: 'Overachiever',
                    deltaPercentage: 101
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('between 0 and 100');
        });

        test('should return 400 for invalid deltaPercentage (not a number)', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'PROJ123',
                    updateText: 'Not a number',
                    deltaPercentage: 'invalid'
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('between 0 and 100');
        });

        test('should return 400 for malformed JSON', async () => {
            const event = {
                body: '{ invalid: json '
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('Invalid JSON');
        });

        test('should handle pre-parsed body (object)', async () => {
             const event = {
                body: {
                    teamId: 'PROJ123',
                    updateText: 'Object body',
                    deltaPercentage: 5
                }
            };

            logProgress.mockResolvedValue({ success: true });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(200);
            expect(logProgress).toHaveBeenCalledWith('PROJ123', 'Object body', 5);
        });

        test('should return 500 if logProgress service fails', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'PROJ123',
                    updateText: 'Failure'
                })
            };

            logProgress.mockRejectedValue(new Error('DynamoDB Error'));

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory handler', () => {
        test('should successfully retrieve progress logs', async () => {
            const event = {
                pathParameters: { teamId: 'PROJ123' }
            };

            const mockLogs = [
                { PK: 'PROJ#PROJ123', SK: 'LOG#1', update_text: 'Start' },
                { PK: 'PROJ#PROJ123', SK: 'LOG#2', update_text: 'End' }
            ];

            getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(getProgressLogs).toHaveBeenCalledWith('PROJ123');
        });

        test('should return 400 if teamId is missing in path parameters', async () => {
            const event = { pathParameters: {} };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('required');
            expect(getProgressLogs).not.toHaveBeenCalled();
        });

        test('should return 500 if getProgressLogs service fails', async () => {
            const event = {
                pathParameters: { teamId: 'PROJ123' }
            };

            getProgressLogs.mockRejectedValue(new Error('DynamoDB Error'));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });
});
