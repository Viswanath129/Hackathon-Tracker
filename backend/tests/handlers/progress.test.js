const { logUpdate, getHistory } = require('../../handlers/progress');
const progressService = require('../../services/progressService');

jest.mock('../../services/progressService');

describe('Progress Lambda Handlers', () => {
    describe('logUpdate', () => {
        it('should log progress successfully with valid data', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'TEAM123',
                    updateText: 'Completed auth module',
                    deltaPercentage: 15.5
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: '2023-10-27T10:00:00Z' });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(progressService.logProgress).toHaveBeenCalledWith('TEAM123', 'Completed auth module', 15.5);
        });

        it('should return 400 if required fields are missing', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'TEAM123'
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('Missing required fields');
        });

        it('should return 400 if deltaPercentage is invalid', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'TEAM123',
                    updateText: 'Update',
                    deltaPercentage: 'invalid'
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('deltaPercentage must be a number');
        });

        it('should return 400 if deltaPercentage is out of range', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'TEAM123',
                    updateText: 'Update',
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
        });

        it('should handle malformed JSON', async () => {
            const event = {
                body: '{ invalid json }'
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Invalid JSON body');
        });

        it('should return 500 if service layer fails', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'TEAM123',
                    updateText: 'Update',
                    deltaPercentage: 10
                })
            };

            progressService.logProgress.mockRejectedValue(new Error('DynamoDB Error'));

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory', () => {
        it('should fetch history successfully', async () => {
            const event = {
                pathParameters: { teamId: 'TEAM123' }
            };

            const mockLogs = [
                { PK: 'PROJ#TEAM123', SK: 'LOG#1', update_text: 'Test 1' },
                { PK: 'PROJ#TEAM123', SK: 'LOG#2', update_text: 'Test 2' }
            ];

            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith('TEAM123');
        });

        it('should return 400 if teamId is missing', async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
        });

        it('should return 500 if service layer fails', async () => {
            const event = {
                pathParameters: { teamId: 'TEAM123' }
            };

            progressService.getProgressLogs.mockRejectedValue(new Error('Query Failed'));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
        });
    });
});
