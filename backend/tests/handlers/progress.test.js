const { logUpdate, getHistory } = require('../../handlers/progress');
const progressService = require('../../services/progressService');

jest.mock('../../services/progressService');

describe('Progress Lambda Handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate', () => {
        it('should log progress successfully with string body', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'proj_123',
                    updateText: 'Completed feature X',
                    deltaPercentage: 10
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: '2023-01-01T00:00:00Z' });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: '2023-01-01T00:00:00Z' });
            expect(progressService.logProgress).toHaveBeenCalledWith('proj_123', 'Completed feature X', 10);
        });

        it('should log progress successfully with object body', async () => {
            const event = {
                body: {
                    teamId: 'proj_123',
                    updateText: 'Completed feature X',
                    deltaPercentage: 10
                }
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: '2023-01-01T00:00:00Z' });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(progressService.logProgress).toHaveBeenCalledWith('proj_123', 'Completed feature X', 10);
        });

        it('should return 400 for malformed JSON', async () => {
            const event = {
                body: '{ invalid json'
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Invalid JSON format');
        });

        it('should return 400 for missing teamId', async () => {
            const event = {
                body: JSON.stringify({
                    updateText: 'Completed feature X'
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('teamId and updateText are required');
        });

        it('should return 400 for invalid deltaPercentage', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'proj_123',
                    updateText: 'Completed feature X',
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('deltaPercentage must be a numeric value between 0 and 100');
        });

        it('should return 500 when service fails', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'proj_123',
                    updateText: 'Completed feature X'
                })
            };

            progressService.logProgress.mockRejectedValue(new Error('DynamoDB Error'));

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory', () => {
        it('should retrieve logs successfully', async () => {
            const event = {
                pathParameters: {
                    teamId: 'proj_123'
                }
            };

            const mockLogs = [
                { PK: 'PROJ#proj_123', SK: 'LOG#1', update_text: 'Log 1' },
                { PK: 'PROJ#proj_123', SK: 'LOG#2', update_text: 'Log 2' }
            ];

            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith('proj_123');
        });

        it('should return 400 if teamId is missing', async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('teamId is required');
        });

        it('should return 500 when service fails', async () => {
            const event = {
                pathParameters: {
                    teamId: 'proj_123'
                }
            };

            progressService.getProgressLogs.mockRejectedValue(new Error('DynamoDB Error'));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });
});
