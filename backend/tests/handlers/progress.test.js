const { logUpdate, getHistory } = require('../../handlers/progress');
const { logProgress, getProgressLogs } = require('../../services/progressService');

jest.mock('../../services/progressService');

describe('Progress Handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate', () => {
        it('should return 201 on successful progress log', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'Task completed',
                    deltaPercentage: 10
                })
            };

            logProgress.mockResolvedValue({ success: true, timestamp: '2023-10-27T10:00:00Z' });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: '2023-10-27T10:00:00Z' });
            expect(logProgress).toHaveBeenCalledWith('team123', 'Task completed', 10);
        });

        it('should return 400 if teamId is missing', async () => {
            const event = {
                body: JSON.stringify({
                    updateText: 'Task completed',
                    deltaPercentage: 10
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('Missing required fields');
        });

        it('should return 400 if deltaPercentage is invalid', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'Task completed',
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('deltaPercentage must be a number between 0 and 100');
        });

        it('should return 400 on malformed JSON', async () => {
            const event = {
                body: '{ invalid json }'
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Invalid JSON body');
        });

        it('should return 500 if service throws an error', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'Task completed',
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
        it('should return 200 and history logs', async () => {
            const event = {
                pathParameters: {
                    teamId: 'team123'
                }
            };

            const mockLogs = [
                { PK: 'PROJ#team123', SK: 'LOG#1', update_text: 'Start', delta_percentage: 0 }
            ];
            getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(getProgressLogs).toHaveBeenCalledWith('team123');
        });

        it('should return 400 if teamId is missing', async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('teamId is required');
        });

        it('should return 500 if service throws an error', async () => {
            const event = {
                pathParameters: {
                    teamId: 'team123'
                }
            };

            getProgressLogs.mockRejectedValue(new Error('Query Error'));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });
});
