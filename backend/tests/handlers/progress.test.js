// Mock the service module first before requiring handler
jest.mock('../../services/progressService', () => ({
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
}));

const { logUpdate, getHistory } = require('../../handlers/progress');
const { logProgress, getProgressLogs } = require('../../services/progressService');

describe('progress lambda handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate handler', () => {
        it('should return 400 Bad Request if request body is missing', async () => {
            const event = {};

            const result = await logUpdate(event);

            expect(result.statusCode).toBe(400);
            const parsedBody = JSON.parse(result.body);
            expect(parsedBody.message).toContain('Request body is missing');
            expect(logProgress).not.toHaveBeenCalled();
        });

        it('should return 400 Bad Request if JSON parsing fails', async () => {
            const event = {
                body: '{ invalid-json }'
            };

            const result = await logUpdate(event);

            expect(result.statusCode).toBe(400);
            const parsedBody = JSON.parse(result.body);
            expect(parsedBody.message).toContain('Invalid JSON body');
            expect(logProgress).not.toHaveBeenCalled();
        });

        it('should return 400 Bad Request if validation fails', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: '',
                    updateText: 'Doing some work',
                    deltaPercentage: 20
                })
            };

            const result = await logUpdate(event);

            expect(result.statusCode).toBe(400);
            const parsedBody = JSON.parse(result.body);
            expect(parsedBody.message).toBe('Bad Request');
            expect(parsedBody.errors).toBeDefined();
            expect(logProgress).not.toHaveBeenCalled();
        });

        it('should log progress and return 201 Created on successful execution with pre-parsed object body', async () => {
            const event = {
                body: {
                    teamId: 'proj-555',
                    updateText: 'Completed backend API',
                    deltaPercentage: 25
                }
            };
            logProgress.mockResolvedValue({ success: true, timestamp: '2023-10-10T15:00:00.000Z' });

            const result = await logUpdate(event);

            expect(result.statusCode).toBe(201);
            expect(result.headers['Access-Control-Allow-Origin']).toBeDefined();
            const parsedBody = JSON.parse(result.body);
            expect(parsedBody.success).toBe(true);
            expect(parsedBody.timestamp).toBe('2023-10-10T15:00:00.000Z');
            expect(logProgress).toHaveBeenCalledWith('proj-555', 'Completed backend API', 25);
        });

        it('should return 500 Internal Server Error if logProgress throws an error', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'proj-555',
                    updateText: 'Completed backend API',
                    deltaPercentage: 25
                })
            };
            logProgress.mockRejectedValue(new Error('Internal DynamoDB Issue'));

            const result = await logUpdate(event);

            expect(result.statusCode).toBe(500);
            const parsedBody = JSON.parse(result.body);
            expect(parsedBody.message).toBe('Internal Server Error'); // Secure generic message
        });
    });

    describe('getHistory handler', () => {
        it('should return 400 Bad Request if teamId path parameter is missing', async () => {
            const event = {
                pathParameters: {}
            };

            const result = await getHistory(event);

            expect(result.statusCode).toBe(400);
            const parsedBody = JSON.parse(result.body);
            expect(parsedBody.message).toContain('Missing teamId path parameter');
            expect(getProgressLogs).not.toHaveBeenCalled();
        });

        it('should return 200 OK and progress logs on success', async () => {
            const event = {
                pathParameters: {
                    teamId: 'proj-777'
                }
            };
            const mockLogs = [
                { PK: 'PROJ#proj-777', SK: 'LOG#2', update_text: 'Setup Repo', delta_percentage: 10 }
            ];
            getProgressLogs.mockResolvedValue(mockLogs);

            const result = await getHistory(event);

            expect(result.statusCode).toBe(200);
            const parsedBody = JSON.parse(result.body);
            expect(parsedBody).toEqual(mockLogs);
            expect(getProgressLogs).toHaveBeenCalledWith('proj-777');
        });

        it('should return 500 Internal Server Error if service query throws', async () => {
            const event = {
                pathParameters: {
                    teamId: 'proj-777'
                }
            };
            getProgressLogs.mockRejectedValue(new Error('DynamoDB client down'));

            const result = await getHistory(event);

            expect(result.statusCode).toBe(500);
            const parsedBody = JSON.parse(result.body);
            expect(parsedBody.message).toBe('Internal Server Error'); // Secure generic message
        });
    });
});
