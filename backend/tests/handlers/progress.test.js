const progressService = require('../../services/progressService');
jest.mock('../../services/progressService');

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Progress Lambda Handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate', () => {
        it('should return 201 when progress is logged successfully', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'Completed module A',
                    deltaPercentage: 25
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: '2023-01-01T00:00:00Z' });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);
            expect(body.message).toBe('Progress update logged successfully');
            expect(body.success).toBe(true);
            expect(progressService.logProgress).toHaveBeenCalledWith('team123', 'Completed module A', 25);
        });

        it('should return 400 when teamId is missing', async () => {
            const event = {
                body: JSON.stringify({
                    updateText: 'Completed module A',
                    deltaPercentage: 25
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('Missing required fields');
        });

        it('should return 400 when deltaPercentage is out of range', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'Completed module A',
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('deltaPercentage must be a numeric value between 0 and 100');
        });

        it('should return 400 when JSON is malformed', async () => {
            const event = {
                body: '{ invalid json }'
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Invalid JSON in request body');
        });

        it('should return 500 when service layer fails', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'Completed module A',
                    deltaPercentage: 25
                })
            };

            progressService.logProgress.mockRejectedValue(new Error('DynamoDB Error'));

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal server error while logging progress');
        });
    });

    describe('getHistory', () => {
        it('should return 200 and logs when successful', async () => {
            const event = {
                pathParameters: { teamId: 'team123' }
            };

            const mockLogs = [{ PK: 'PROJ#team123', SK: 'LOG#123', update_text: 'Update' }];
            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith('team123');
        });

        it('should return 400 when teamId is missing from path parameters', async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('teamId path parameter is required');
        });

        it('should return 500 when service layer fails', async () => {
            const event = {
                pathParameters: { teamId: 'team123' }
            };

            progressService.getProgressLogs.mockRejectedValue(new Error('DynamoDB Error'));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal server error while fetching progress history');
        });
    });
});
