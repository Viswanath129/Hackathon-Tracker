const { logUpdate, getHistory } = require('./progress');
const progressService = require('../services/progressService');

// Mock progressService
jest.mock('../services/progressService');

describe('Progress Lambda Handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate', () => {
        it('should return 201 on successful log', async () => {
            const event = {
                body: JSON.stringify({
                    projectId: 'test-proj',
                    updateText: 'test update',
                    deltaPercentage: 10
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: '2023-01-01T00:00:00Z' });

            const result = await logUpdate(event);

            expect(result.statusCode).toBe(201);
            expect(JSON.parse(result.body).success).toBe(true);
            expect(progressService.logProgress).toHaveBeenCalledWith('test-proj', 'test update', 10);
        });

        it('should return 400 if body is missing', async () => {
            const event = {};
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).message).toBe('Missing request body');
        });

        it('should return 400 if required fields are missing', async () => {
            const event = {
                body: JSON.stringify({
                    projectId: 'test-proj'
                    // updateText missing
                })
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).message).toBe('Missing projectId or updateText');
        });
    });

    describe('getHistory', () => {
        it('should return 200 and logs', async () => {
            const event = {
                pathParameters: {
                    projectId: 'test-proj'
                }
            };

            const mockLogs = [{ PK: 'PROJ#test-proj', SK: 'LOG#1', update_text: 'hi' }];
            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const result = await getHistory(event);

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith('test-proj');
        });

        it('should return 400 if projectId is missing', async () => {
            const event = {
                pathParameters: {}
            };
            const result = await getHistory(event);
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).message).toBe('Missing projectId path parameter');
        });
    });
});
