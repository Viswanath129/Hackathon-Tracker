const progressService = require('../../services/progressService');
const progressHandler = require('../../handlers/progress');

jest.mock('../../services/progressService');

describe('Progress Lambda Handlers', () => {
    describe('logUpdate', () => {
        it('should return 201 when progress is logged successfully', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'TEAM123',
                    updateText: 'Started working on UI',
                    deltaPercentage: 10
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: '2023-10-27T10:00:00Z' });

            const response = await progressHandler.logUpdate(event);

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);
            expect(body.message).toBe('Progress logged successfully');
            expect(body.timestamp).toBe('2023-10-27T10:00:00Z');
        });

        it('should return 400 when missing fields', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'TEAM123'
                })
            };

            const response = await progressHandler.logUpdate(event);

            expect(response.statusCode).toBe(400);
        });

        it('should return 400 when deltaPercentage is out of range', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'TEAM123',
                    updateText: 'Too much progress',
                    deltaPercentage: 150
                })
            };

            const response = await progressHandler.logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('deltaPercentage must be a numeric value between -100 and 100');
        });

        it('should return 400 when deltaPercentage is not a number', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'TEAM123',
                    updateText: 'Not a number',
                    deltaPercentage: 'invalid'
                })
            };

            const response = await progressHandler.logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('deltaPercentage must be a numeric value between -100 and 100');
        });

        it('should return 400 when body is invalid JSON', async () => {
            const event = {
                body: '{ invalid json }'
            };

            const response = await progressHandler.logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Invalid JSON in request body');
        });
    });

    describe('getHistory', () => {
        it('should return 200 and logs for a valid teamId', async () => {
            const event = {
                pathParameters: {
                    teamId: 'TEAM123'
                }
            };

            const mockLogs = [
                { PK: 'PROJ#TEAM123', SK: 'LOG#1', update_text: 'Test log', delta_percentage: 5 }
            ];
            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await progressHandler.getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
        });

        it('should return 400 when teamId is missing', async () => {
            const event = {
                pathParameters: {}
            };

            const response = await progressHandler.getHistory(event);

            expect(response.statusCode).toBe(400);
        });
    });
});
