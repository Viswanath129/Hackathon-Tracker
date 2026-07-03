const { logUpdate, getHistory } = require('../../handlers/progress');
const { logProgress, getProgressLogs } = require('../../services/progressService');

jest.mock('../../services/progressService');

describe('Progress Lambda Handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate', () => {
        test('should return 201 on successful log', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'proj123',
                    updateText: 'Completed UI',
                    deltaPercentage: 10
                })
            };

            logProgress.mockResolvedValue({ success: true, timestamp: '2023-10-01T00:00:00Z' });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);
            expect(body.message).toBe('Progress logged successfully');
            expect(logProgress).toHaveBeenCalledWith('proj123', 'Completed UI', 10);
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
            expect(JSON.parse(response.body).message).toContain('teamId');
        });

        test('should return 400 if deltaPercentage is invalid', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'proj123',
                    updateText: 'Completed UI',
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('deltaPercentage');
        });

        test('should handle stringified body and object body', async () => {
            const event = {
                body: {
                    teamId: 'proj123',
                    updateText: 'Completed UI',
                    deltaPercentage: 10
                }
            };

            logProgress.mockResolvedValue({ success: true, timestamp: '2023-10-01T00:00:00Z' });

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(201);
        });
    });

    describe('getHistory', () => {
        test('should return 200 and logs on success', async () => {
            const event = {
                pathParameters: { teamId: 'proj123' }
            };

            const mockLogs = [{ PK: 'PROJ#proj123', SK: 'LOG#1', update_text: 'Test' }];
            getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(getProgressLogs).toHaveBeenCalledWith('proj123');
        });

        test('should return 400 if teamId is missing', async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);
            expect(response.statusCode).toBe(400);
        });
    });
});
