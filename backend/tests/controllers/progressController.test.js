jest.mock('../../services/progressService');

const { logUpdateExpress, getHistoryExpress } = require('../../controllers/progressController');
const { logProgress, getProgressLogs } = require('../../services/progressService');

describe('Progress Express Controllers', () => {
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

    describe('logUpdateExpress', () => {
        it('should log progress successfully with 201 status code', async () => {
            logProgress.mockResolvedValue({ success: true });
            req.body = {
                teamId: 'proj_123',
                updateText: 'Completed task 1',
                deltaPercentage: 20
            };

            await logUpdateExpress(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ message: 'Created', success: true });
            expect(logProgress).toHaveBeenCalledWith('proj_123', 'Completed task 1', 20);
        });

        it('should return 400 if validation fails', async () => {
            req.body = {
                teamId: '',
                updateText: 'Completed task 1',
                deltaPercentage: 20
            };

            await logUpdateExpress(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
        });

        it('should return 500 if service throws error', async () => {
            logProgress.mockRejectedValue(new Error('DB Error'));
            req.body = {
                teamId: 'proj_123',
                updateText: 'Completed task 1',
                deltaPercentage: 20
            };

            await logUpdateExpress(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });

    describe('getHistoryExpress', () => {
        it('should return history with 200 status code', async () => {
            const mockLogs = [{ PK: 'PROJ#proj_123', update_text: 'Test log' }];
            getProgressLogs.mockResolvedValue(mockLogs);
            req.params.teamId = 'proj_123';

            await getHistoryExpress(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockLogs);
            expect(getProgressLogs).toHaveBeenCalledWith('proj_123');
        });

        it('should return 400 if teamId is missing', async () => {
            req.params.teamId = '';

            await getHistoryExpress(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
        });

        it('should return 500 if service throws error', async () => {
            getProgressLogs.mockRejectedValue(new Error('DB Error'));
            req.params.teamId = 'proj_123';

            await getHistoryExpress(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });
});
