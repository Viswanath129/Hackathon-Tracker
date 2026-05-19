const { logUpdate, getHistory } = require('../handlers/progress');
const progressService = require('../services/progressService');

jest.mock('../services/progressService');

describe('Progress Handlers', () => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate', () => {
        it('should return 201 on successful update', async () => {
            const event = {
                body: JSON.stringify({
                    projectId: 'proj123',
                    updateText: 'Progressing',
                    deltaPercentage: 10
                })
            };
            progressService.logProgress.mockResolvedValue({ success: true, timestamp: '2023-10-27T10:00:00Z' });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: '2023-10-27T10:00:00Z' });
            expect(response.headers).toEqual(headers);
        });

        it('should return 400 if projectId is missing', async () => {
            const event = {
                body: JSON.stringify({ updateText: 'Missing ID' })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('projectId and updateText are required');
        });

        it('should return 400 if deltaPercentage is invalid', async () => {
            const event = {
                body: JSON.stringify({
                    projectId: 'proj123',
                    updateText: 'Invalid delta',
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('deltaPercentage must be a numeric value between 0 and 100');
        });

        it('should return 500 on service failure', async () => {
            const event = {
                body: JSON.stringify({
                    projectId: 'proj123',
                    updateText: 'Will fail'
                })
            };
            progressService.logProgress.mockRejectedValue(new Error('DB Error'));

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal server error');
        });
    });

    describe('getHistory', () => {
        it('should return 200 and logs on success', async () => {
            const event = {
                pathParameters: { teamId: 'proj123' }
            };
            const mockLogs = [{ update_text: 'Log 1', delta_percentage: 5 }];
            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith('proj123');
        });

        it('should return 400 if teamId is missing', async () => {
            const event = { pathParameters: {} };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('teamId path parameter is required');
        });

        it('should return 500 on service failure', async () => {
            const event = { pathParameters: { teamId: 'proj123' } };
            progressService.getProgressLogs.mockRejectedValue(new Error('DB Error'));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal server error');
        });
    });
});
