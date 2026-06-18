const { logUpdate, getHistory } = require('../../handlers/progress');
const progressService = require('../../services/progressService');

jest.mock('../../services/progressService');

describe('Progress Lambda Handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate', () => {
        it('should log progress and return 201 on success', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'Completed UI',
                    deltaPercentage: 25
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: '2023-01-01T00:00:00Z' });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: '2023-01-01T00:00:00Z' });
            expect(progressService.logProgress).toHaveBeenCalledWith('team123', 'Completed UI', 25);
        });

        it('should return 400 for invalid JSON body', async () => {
            const event = {
                body: '{ invalid json'
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Invalid JSON body');
        });

        it('should return 400 for missing required fields', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123'
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('Missing required fields');
        });

        it('should return 400 for invalid deltaPercentage (too high)', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'test',
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('deltaPercentage must be a numeric value between -100 and 100');
        });

        it('should return 400 for invalid deltaPercentage (too low)', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'test',
                    deltaPercentage: -150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('deltaPercentage must be a numeric value between -100 and 100');
        });

        it('should allow negative deltaPercentage', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'Reverted UI changes',
                    deltaPercentage: -10
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: '2023-01-01T00:00:00Z' });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(progressService.logProgress).toHaveBeenCalledWith('team123', 'Reverted UI changes', -10);
        });

        it('should return 500 when progressService fails', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'test',
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
        it('should return progress history and 200 on success', async () => {
            const event = {
                pathParameters: {
                    teamId: 'team123'
                }
            };

            const mockLogs = [
                { PK: 'PROJ#team123', SK: 'LOG#1', update_text: 'Start', delta_percentage: 10 }
            ];
            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith('team123');
        });

        it('should return 400 when teamId is missing', async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('teamId is required in path parameters');
        });

        it('should return 500 when progressService fails', async () => {
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
