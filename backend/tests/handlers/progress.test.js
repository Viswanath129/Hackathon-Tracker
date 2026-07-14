const { logUpdate, getHistory } = require('../../handlers/progress');
const { logProgress, getProgressLogs } = require('../../services/progressService');

// Mock progressService
jest.mock('../../services/progressService');

describe('Progress Lambda Handlers', () => {

    describe('logUpdate', () => {
        test('should return 400 if body is missing', async () => {
            const event = {};
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Missing request body');
        });

        test('should return 400 if teamId is missing', async () => {
            const event = {
                body: JSON.stringify({ updateText: 'Testing', deltaPercentage: 10 })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('teamId is required');
        });

        test('should return 400 if updateText is missing', async () => {
            const event = {
                body: JSON.stringify({ teamId: 'team123', deltaPercentage: 10 })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('updateText is required');
        });

        test('should return 400 if deltaPercentage is invalid', async () => {
            const event = {
                body: JSON.stringify({ teamId: 'team123', updateText: 'Testing', deltaPercentage: 'invalid' })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('deltaPercentage must be a numeric value');
        });

        test('should return 400 if deltaPercentage is out of range', async () => {
            const event = {
                body: JSON.stringify({ teamId: 'team123', updateText: 'Testing', deltaPercentage: 150 })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('between -100 and 100');
        });

        test('should return 201 on success', async () => {
            logProgress.mockResolvedValue({ success: true });
            const event = {
                body: JSON.stringify({ teamId: 'team123', updateText: 'Testing', deltaPercentage: 10 })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body).message).toBe('Progress logged successfully');
            expect(logProgress).toHaveBeenCalledWith('team123', 'Testing', 10);
        });

        test('should handle service errors', async () => {
            logProgress.mockRejectedValue(new Error('DynamoDB Error'));
            const event = {
                body: JSON.stringify({ teamId: 'team123', updateText: 'Testing', deltaPercentage: 10 })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory', () => {
        test('should return 400 if teamId is missing in pathParameters', async () => {
            const event = { pathParameters: null };
            const response = await getHistory(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('teamId is required');
        });

        test('should return 200 and logs on success', async () => {
            const mockLogs = [{ SK: 'LOG#1', update_text: 'Test' }];
            getProgressLogs.mockResolvedValue(mockLogs);
            const event = {
                pathParameters: { teamId: 'team123' }
            };
            const response = await getHistory(event);
            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(getProgressLogs).toHaveBeenCalledWith('team123');
        });

        test('should handle service errors', async () => {
            getProgressLogs.mockRejectedValue(new Error('Query Error'));
            const event = {
                pathParameters: { teamId: 'team123' }
            };
            const response = await getHistory(event);
            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });
});
