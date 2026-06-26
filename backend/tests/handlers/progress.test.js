const progressService = require('../../services/progressService');
const { logUpdate, getHistory } = require('../../handlers/progress');

jest.mock('../../services/progressService');

describe('Progress Lambda Handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate handler', () => {
        it('should return 201 when logging progress successfully', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'TEAM123',
                    updateText: 'Completed UI',
                    deltaPercentage: 10
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: '2023-01-01T00:00:00Z' });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: '2023-01-01T00:00:00Z' });
            expect(progressService.logProgress).toHaveBeenCalledWith('TEAM123', 'Completed UI', 10);
        });

        it('should return 400 if teamId is not a string', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 123,
                    updateText: 'Missing team',
                    deltaPercentage: 5
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('teamId must be a non-empty string');
        });

        it('should return 400 if updateText is empty string', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'TEAM123',
                    updateText: ' ',
                    deltaPercentage: 5
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('updateText must be a non-empty string');
        });

        it('should return 400 if deltaPercentage is invalid numeric string', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'TEAM123',
                    updateText: 'Invalid delta',
                    deltaPercentage: '10abc'
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('deltaPercentage must be a numeric value between -100 and 100');
        });

        it('should return 400 if deltaPercentage is out of range', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'TEAM123',
                    updateText: 'Out of range',
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('deltaPercentage must be a numeric value between -100 and 100');
        });

        it('should return 400 for malformed JSON', async () => {
            const event = {
                body: '{ invalid: json '
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Invalid JSON body');
        });

        it('should return 400 if body is null', async () => {
            const event = {
                body: null
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Request body is required');
        });

        it('should return 500 if service throws error', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'TEAM123',
                    updateText: 'Error case',
                    deltaPercentage: 0
                })
            };

            progressService.logProgress.mockRejectedValue(new Error('DynamoDB Error'));

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(500);
        });
    });

    describe('getHistory handler', () => {
        it('should return 200 and logs successfully', async () => {
            const event = {
                pathParameters: {
                    teamId: 'TEAM123'
                }
            };

            const mockLogs = [
                { PK: 'PROJ#TEAM123', SK: 'LOG#1', update_text: 'Log 1' },
                { PK: 'PROJ#TEAM123', SK: 'LOG#2', update_text: 'Log 2' }
            ];

            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith('TEAM123');
        });

        it('should return 400 if teamId is missing in path parameters', async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Missing teamId in path parameters');
        });
    });
});
