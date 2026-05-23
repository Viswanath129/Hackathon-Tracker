const progressService = require('../../services/progressService');
const progressHandler = require('../../handlers/progress');

jest.mock('../../services/progressService');

describe('Progress Lambda Handlers', () => {
    describe('logUpdate', () => {
        it('should return 201 on successful progress log', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'proj-123',
                    updateText: 'Completed module A',
                    deltaPercentage: 15
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: '2023-10-27T10:00:00Z' });

            const result = await progressHandler.logUpdate(event);

            expect(result.statusCode).toBe(201);
            expect(JSON.parse(result.body)).toHaveProperty('success', true);
            expect(progressService.logProgress).toHaveBeenCalledWith('proj-123', 'Completed module A', 15);
        });

        it('should return 400 if teamId is missing', async () => {
            const event = {
                body: JSON.stringify({
                    updateText: 'Missing teamId',
                    deltaPercentage: 10
                })
            };

            const result = await progressHandler.logUpdate(event);

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).message).toContain('Missing required fields');
        });

        it('should return 400 if deltaPercentage is invalid', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'proj-123',
                    updateText: 'Invalid delta',
                    deltaPercentage: 150
                })
            };

            const result = await progressHandler.logUpdate(event);

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).message).toContain('deltaPercentage must be a numeric value between 0 and 100');
        });

        it('should return 400 if body is malformed JSON', async () => {
            const event = {
                body: '{"teamId": "proj-123", "updateText": "Malformed", "deltaPercentage": 10' // Missing closing brace
            };

            const result = await progressHandler.logUpdate(event);

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).message).toBe('Malformed JSON in request body');
        });

        it('should return 500 if service throws an error', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'proj-123',
                    updateText: 'Service failure',
                    deltaPercentage: 5
                })
            };

            progressService.logProgress.mockRejectedValue(new Error('DynamoDB Error'));

            const result = await progressHandler.logUpdate(event);

            expect(result.statusCode).toBe(500);
            expect(JSON.parse(result.body).message).toBe('Internal server error');
        });
    });

    describe('getHistory', () => {
        it('should return 200 and logs for a valid teamId', async () => {
            const event = {
                pathParameters: {
                    teamId: 'proj-123'
                }
            };

            const mockLogs = [
                { PK: 'PROJ#proj-123', SK: 'LOG#1', update_text: 'Update 1' },
                { PK: 'PROJ#proj-123', SK: 'LOG#2', update_text: 'Update 2' }
            ];

            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const result = await progressHandler.getHistory(event);

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith('proj-123');
        });

        it('should return 400 if teamId is missing in path parameters', async () => {
            const event = {
                pathParameters: {}
            };

            const result = await progressHandler.getHistory(event);

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).message).toContain('Missing teamId');
        });
    });
});
