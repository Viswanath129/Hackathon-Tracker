const { logUpdate, getHistory } = require('../../handlers/progress');
const progressService = require('../../services/progressService');

jest.mock('../../services/progressService');

describe('Progress Lambda Handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate', () => {
        it('should successfully log progress update', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    projectId: 'proj456',
                    updateText: 'Completed task A',
                    deltaPercentage: 10
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: '2023-01-01T00:00:00Z' });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: '2023-01-01T00:00:00Z' });
            expect(progressService.logProgress).toHaveBeenCalledWith('proj456', 'Completed task A', 10);
        });

        it('should handle numeric deltaPercentage correctly', async () => {
            const event = {
                body: {
                    teamId: 'team123',
                    projectId: 'proj456',
                    updateText: 'Completed task A',
                    deltaPercentage: '15.5'
                }
            };

            progressService.logProgress.mockResolvedValue({ success: true });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(progressService.logProgress).toHaveBeenCalledWith('proj456', 'Completed task A', 15.5);
        });

        it('should return 400 for missing fields', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    // projectId missing
                    updateText: 'Missing project',
                    deltaPercentage: 10
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('Missing required fields');
        });

        it('should return 400 for invalid deltaPercentage', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    projectId: 'proj456',
                    updateText: 'Invalid delta',
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('deltaPercentage must be a numeric value between 0 and 100');
        });

        it('should return 400 for malformed JSON', async () => {
            const event = {
                body: '{ invalid json'
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Malformed JSON in request body');
        });

        it('should return 500 on service error', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    projectId: 'proj456',
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
        it('should successfully fetch history', async () => {
            const event = {
                pathParameters: {
                    teamId: 'proj456'
                }
            };

            const mockLogs = [
                { PK: 'PROJ#proj456', SK: 'LOG#1', update_text: 'Log 1' },
                { PK: 'PROJ#proj456', SK: 'LOG#2', update_text: 'Log 2' }
            ];

            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith('proj456');
        });

        it('should return 400 if teamId is missing in path', async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('Project ID is required');
        });

        it('should return 500 on service error', async () => {
            const event = {
                pathParameters: {
                    teamId: 'proj456'
                }
            };

            progressService.getProgressLogs.mockRejectedValue(new Error('Query failed'));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });
});
