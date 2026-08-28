const { logProgressUpdate, getProgressHistory } = require('../../controllers/progressController');
const progressService = require('../../services/progressService');
const dynamoService = require('../../services/dynamoService');

jest.mock('../../services/progressService');
jest.mock('../../services/dynamoService');

describe('Progress Express Controller', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { _id: 't1', email: 'team@example.com', role: 'team' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('logProgressUpdate', () => {
        it('should return 400 for invalid input', async () => {
            req.body = { teamId: 'p1', updateText: 'Valid', deltaPercentage: 'invalid' };
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'deltaPercentage must be a numeric value' });
        });

        it('should return 403 when user lacks project ownership', async () => {
            req.body = { teamId: 'p1', updateText: 'Valid', deltaPercentage: 15 };
            dynamoService.getProjectById.mockResolvedValue({ _id: 'p1', team_id: 'other_team' });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: Insufficient project permissions' });
        });

        it('should return 201 on success', async () => {
            req.body = { teamId: 'p1', updateText: 'Valid', deltaPercentage: 15 };
            dynamoService.getProjectById.mockResolvedValue({ _id: 'p1', team_id: 't1' });
            progressService.logProgress.mockResolvedValue({ success: true });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress update logged successfully',
                data: { success: true }
            });
        });
    });

    describe('getProgressHistory', () => {
        it('should return 200 with logs on success', async () => {
            req.params.teamId = 'p1';
            dynamoService.getProjectById.mockResolvedValue({ _id: 'p1', team_id: 't1' });
            const mockLogs = [{ update_text: 'Log 1' }];
            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockLogs);
        });
    });
});
