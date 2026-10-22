const { logUpdate, getHistory } = require('../../controllers/progressController');

jest.mock('../../services/dynamoService', () => ({
    getProjectById: jest.fn()
}));

jest.mock('../../services/progressService', () => ({
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
}));

const dynamoService = require('../../services/dynamoService');
const progressService = require('../../services/progressService');

describe('progressController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = { body: {}, params: {}, user: { _id: 'user_1', email: 'user@example.com' } };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logUpdate', () => {
        test('returns 400 when validation fails', async () => {
            req.body = { teamId: '', updateText: 'test', deltaPercentage: 10 };
            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 404 when project is not found', async () => {
            req.body = { teamId: 'proj_999', updateText: 'test', deltaPercentage: 10 };
            dynamoService.getProjectById.mockResolvedValue(null);

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        test('returns 403 when user does not own project', async () => {
            req.body = { teamId: 'proj_123', updateText: 'test', deltaPercentage: 10 };
            dynamoService.getProjectById.mockResolvedValue({ _id: 'proj_123', teamId: 'other_user' });

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: You do not own this project' });
        });

        test('returns 201 on success', async () => {
            req.body = { teamId: 'proj_123', updateText: 'test', deltaPercentage: 10 };
            dynamoService.getProjectById.mockResolvedValue({ _id: 'proj_123', teamId: 'user_1' });
            progressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress update logged successfully',
                data: { success: true, timestamp: '2026-02-28T00:00:00.000Z' }
            });
        });
    });

    describe('getHistory', () => {
        test('returns 404 when project is not found', async () => {
            req.params = { teamId: 'proj_999' };
            dynamoService.getProjectById.mockResolvedValue(null);

            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('returns 200 on success', async () => {
            req.params = { teamId: 'proj_123' };
            dynamoService.getProjectById.mockResolvedValue({ _id: 'proj_123', teamId: 'user_1' });
            progressService.getProgressLogs.mockResolvedValue([{ update_text: 'Done', delta_percentage: 20 }]);

            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress logs retrieved successfully',
                data: [{ update_text: 'Done', delta_percentage: 20 }]
            });
        });
    });
});
