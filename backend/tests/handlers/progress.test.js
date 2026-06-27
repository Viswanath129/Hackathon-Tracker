const { logUpdate, getHistory } = require('../../handlers/progress');
const { logProgress, getProgressLogs } = require('../../services/progressService');

jest.mock('../../services/progressService');

describe('Progress Handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate', () => {
        it('should return 201 on successful log', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'TEAM123',
                    updateText: 'Completed UI design',
                    deltaPercentage: 10
                })
            };

            logProgress.mockResolvedValue({ success: true, timestamp: '2023-10-01T12:00:00Z' });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: '2023-10-01T12:00:00Z' });
            expect(logProgress).toHaveBeenCalledWith('TEAM123', 'Completed UI design', 10);
        });

        it('should return 400 if teamId is missing', async () => {
            const event = {
                body: JSON.stringify({
                    updateText: 'Completed UI design',
                    deltaPercentage: 10
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('teamId is required');
        });

        it('should return 400 if deltaPercentage is invalid', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'TEAM123',
                    updateText: 'Completed UI design',
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('deltaPercentage must be a number between -100 and 100');
        });

        it('should return 400 for invalid JSON', async () => {
            const event = {
                body: '{ invalid json }'
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Invalid JSON');
        });

        it('should return 500 if service throws error', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'TEAM123',
                    updateText: 'Completed UI design',
                    deltaPercentage: 10
                })
            };

            logProgress.mockRejectedValue(new Error('DynamoDB Error'));

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory', () => {
        it('should return 200 and logs on success', async () => {
            const event = {
                pathParameters: { teamId: 'TEAM123' }
            };

            const mockLogs = [
                { PK: 'PROJ#TEAM123', SK: 'LOG#1', update_text: 'Start', delta_percentage: 0 }
            ];
            getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(getProgressLogs).toHaveBeenCalledWith('TEAM123');
        });

        it('should return 400 if teamId is missing in path', async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('teamId path parameter is required');
        });

        it('should return 500 if service throws error', async () => {
            const event = {
                pathParameters: { teamId: 'TEAM123' }
            };

            getProgressLogs.mockRejectedValue(new Error('DynamoDB Error'));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });
});
