jest.mock('../../services/progressService', () => ({
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
}));

const { logProgress, getProgressLogs } = require('../../services/progressService');
const { logUpdate, getHistory } = require('../../controllers/progressController');

describe('Express Progress Controller', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logUpdate', () => {
        it('should return 400 Bad Request if req.body is missing', async () => {
            req.body = null;
            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Request body is missing' });
        });

        it('should return 400 Bad Request if validation fails', async () => {
            req.body = {
                teamId: 'team-123',
                updateText: '', // invalid empty string
                deltaPercentage: 20
            };
            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Validation Failed'
            }));
        });

        it('should return 201 Created and return progress logging result on success', async () => {
            req.body = {
                teamId: 'team-123',
                updateText: 'Step progress',
                deltaPercentage: 5
            };
            const mockResult = { success: true, timestamp: '12345' };
            logProgress.mockResolvedValue(mockResult);

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(mockResult);
            expect(logProgress).toHaveBeenCalledWith('team-123', 'Step progress', 5);
        });

        it('should return 500 on internal service error', async () => {
            req.body = {
                teamId: 'team-123',
                updateText: 'Step progress',
                deltaPercentage: 5
            };
            logProgress.mockRejectedValue(new Error('DynamoDB Error'));

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'DynamoDB Error' });
        });
    });

    describe('getHistory', () => {
        it('should return 400 if teamId param is missing', async () => {
            req.params = { teamId: '' };
            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'teamId parameter is required' });
        });

        it('should return 200 OK and progress logs on success', async () => {
            req.params = { teamId: 'team-123' };
            const mockLogs = [{ update_text: 'Done', delta_percentage: 100 }];
            getProgressLogs.mockResolvedValue(mockLogs);

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockLogs);
            expect(getProgressLogs).toHaveBeenCalledWith('team-123');
        });

        it('should return 500 on internal service error', async () => {
            req.params = { teamId: 'team-123' };
            getProgressLogs.mockRejectedValue(new Error('Query failed'));

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Query failed' });
        });
    });
});
