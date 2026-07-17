// Mock the service module first before requiring controller
jest.mock('../../services/progressService', () => ({
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
}));

const { logUpdate, getHistory } = require('../../controllers/progressController');
const { logProgress, getProgressLogs } = require('../../services/progressService');

describe('progressController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            query: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logUpdate', () => {
        it('should return 400 if validation fails', async () => {
            req.body = { teamId: '', updateText: 'Testing', deltaPercentage: 50 };

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Bad Request',
                    errors: expect.any(Array)
                })
            );
            expect(logProgress).not.toHaveBeenCalled();
        });

        it('should log progress and return 201 on successful input', async () => {
            req.body = { teamId: 'proj-123', updateText: 'Build and deploy pipeline', deltaPercentage: 15 };
            logProgress.mockResolvedValue({ success: true, timestamp: '2023-10-10T12:00:00.000Z' });

            await logUpdate(req, res);

            expect(logProgress).toHaveBeenCalledWith('proj-123', 'Build and deploy pipeline', 15);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Progress logged successfully',
                timestamp: '2023-10-10T12:00:00.000Z'
            });
        });

        it('should return 500 if logProgress throws an error', async () => {
            req.body = { teamId: 'proj-123', updateText: 'Build and deploy pipeline', deltaPercentage: 15 };
            logProgress.mockRejectedValue(new Error('DynamoDB Error'));

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'DynamoDB Error' });
        });
    });

    describe('getHistory', () => {
        it('should retrieve progress history and return 200', async () => {
            req.params = { teamId: 'proj-123' };
            const mockLogs = [
                { PK: 'PROJ#proj-123', SK: 'LOG#1', update_text: 'Setup', delta_percentage: 10 }
            ];
            getProgressLogs.mockResolvedValue(mockLogs);

            await getHistory(req, res);

            expect(getProgressLogs).toHaveBeenCalledWith('proj-123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockLogs);
        });

        it('should return 500 if getProgressLogs throws an error', async () => {
            req.params = { teamId: 'proj-123' };
            getProgressLogs.mockRejectedValue(new Error('DynamoDB Query Failed'));

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'DynamoDB Query Failed' });
        });
    });
});
