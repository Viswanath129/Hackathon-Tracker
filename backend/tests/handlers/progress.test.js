const { logUpdate, getHistory } = require('../../handlers/progress');
const progressService = require('../../services/progressService');

jest.mock('../../services/progressService');

describe('Progress Lambda Handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate', () => {
        test('should return 201 on successful log', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'Completed UI',
                    deltaPercentage: 10
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: '2023-01-01T00:00:00Z' });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toHaveProperty('success', true);
            expect(progressService.logProgress).toHaveBeenCalledWith('team123', 'Completed UI', 10);
        });

        test('should return 400 if teamId is missing', async () => {
            const event = {
                body: JSON.stringify({
                    updateText: 'Completed UI',
                    deltaPercentage: 10
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('teamId is required');
        });

        test('should return 400 if deltaPercentage is invalid', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'Completed UI',
                    deltaPercentage: 'invalid'
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('deltaPercentage must be a number between -100 and 100');
        });

        test('should return 400 if body is invalid JSON', async () => {
            const event = {
                body: 'invalid-json'
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Invalid JSON');
        });
    });

    describe('getHistory', () => {
        test('should return 200 and logs on success', async () => {
            const event = {
                pathParameters: {
                    teamId: 'team123'
                }
            };

            const mockLogs = [
                { PK: 'PROJ#team123', SK: 'LOG#1', update_text: 'Start', delta_percentage: 0 }
            ];
            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith('team123');
        });

        test('should return 400 if teamId is missing', async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('teamId parameter is required');
        });

        test('should return 500 if service fails', async () => {
            const event = {
                pathParameters: {
                    teamId: 'team123'
                }
            };

            progressService.getProgressLogs.mockRejectedValue(new Error('DynamoDB Error'));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });
});
