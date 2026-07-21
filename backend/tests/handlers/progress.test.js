jest.mock('../../services/progressService');

const { logUpdate, getHistory } = require('../../handlers/progress');
const { logProgress, getProgressLogs } = require('../../services/progressService');

describe('Progress Lambda Handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate', () => {
        it('should log progress successfully with 201 status code', async () => {
            logProgress.mockResolvedValue({ success: true });

            const event = {
                body: JSON.stringify({
                    teamId: 'proj_123',
                    updateText: 'Completed task 1',
                    deltaPercentage: 20
                })
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body).success).toBe(true);
            expect(logProgress).toHaveBeenCalledWith('proj_123', 'Completed task 1', 20);
        });

        it('should handle pre-parsed body object', async () => {
            logProgress.mockResolvedValue({ success: true });

            const event = {
                body: {
                    teamId: 'proj_123',
                    updateText: 'Completed task 1',
                    deltaPercentage: 20
                }
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(201);
            expect(logProgress).toHaveBeenCalledWith('proj_123', 'Completed task 1', 20);
        });

        it('should return 400 if body is missing', async () => {
            const response = await logUpdate({});
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('Missing request body');
        });

        it('should return 400 if JSON parsing fails', async () => {
            const event = {
                body: '{invalid-json'
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('Invalid JSON');
        });

        it('should return 400 if validation fails (empty teamId)', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: '',
                    updateText: 'Completed task 1',
                    deltaPercentage: 20
                })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('teamId');
        });

        it('should return 400 if validation fails (invalid deltaPercentage)', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'proj_123',
                    updateText: 'Completed task 1',
                    deltaPercentage: 150
                })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('deltaPercentage');
        });

        it('should return 500 if logProgress throws an error', async () => {
            logProgress.mockRejectedValue(new Error('DynamoDB Error'));

            const event = {
                body: JSON.stringify({
                    teamId: 'proj_123',
                    updateText: 'Completed task 1',
                    deltaPercentage: 20
                })
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory', () => {
        it('should return progress history with 200 status code', async () => {
            const mockLogs = [{ PK: 'PROJ#proj_123', SK: 'LOG#123', update_text: 'Test log', delta_percentage: 10 }];
            getProgressLogs.mockResolvedValue(mockLogs);

            const event = {
                pathParameters: {
                    teamId: 'proj_123'
                }
            };

            const response = await getHistory(event);
            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(getProgressLogs).toHaveBeenCalledWith('proj_123');
        });

        it('should return 400 if teamId is missing', async () => {
            const response = await getHistory({ pathParameters: {} });
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('Missing teamId');
        });

        it('should return 500 if service throws error', async () => {
            getProgressLogs.mockRejectedValue(new Error('Query Error'));

            const event = {
                pathParameters: {
                    teamId: 'proj_123'
                }
            };

            const response = await getHistory(event);
            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });
});
