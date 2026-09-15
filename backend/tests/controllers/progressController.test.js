const mockDynamoService = {
    getProjectById: jest.fn()
};

const mockProgressService = {
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
};

jest.mock('../../services/dynamoService', () => mockDynamoService);
jest.mock('../../services/progressService', () => mockProgressService);

const { logProgressUpdate, getProgressHistory } = require('../../controllers/progressController');

describe('Progress Express Controller', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { _id: 'team_1', email: 'team@test.com' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('logProgressUpdate', () => {
        test('returns 400 for bad validation', async () => {
            req.body = { teamId: '', updateText: 'test', deltaPercentage: 10 };

            await logProgressUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 404 when project does not exist', async () => {
            req.body = { teamId: 'proj_missing', updateText: 'test', deltaPercentage: 10 };
            mockDynamoService.getProjectById.mockResolvedValueOnce(null);

            await logProgressUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        test('returns 403 when user is not project owner', async () => {
            req.body = { teamId: 'proj_1', updateText: 'test', deltaPercentage: 10 };
            mockDynamoService.getProjectById.mockResolvedValueOnce({ _id: 'proj_1', team_id: 'other_team' });

            await logProgressUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
        });

        test('returns 201 Created on success', async () => {
            req.body = { teamId: 'proj_1', updateText: 'test', deltaPercentage: 10 };
            mockDynamoService.getProjectById.mockResolvedValueOnce({ _id: 'proj_1', team_id: 'team_1' });
            mockProgressService.logProgress.mockResolvedValueOnce({ success: true });

            await logProgressUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ message: 'Progress logged successfully', data: { success: true } });
        });
    });

    describe('getProgressHistory', () => {
        test('returns 404 when project is not found', async () => {
            req.params = { teamId: 'proj_missing' };
            mockDynamoService.getProjectById.mockResolvedValueOnce(null);

            await getProgressHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('returns 200 OK with logs', async () => {
            req.params = { teamId: 'proj_1' };
            mockDynamoService.getProjectById.mockResolvedValueOnce({ _id: 'proj_1', team_id: 'team_1' });
            mockProgressService.getProgressLogs.mockResolvedValueOnce([{ update_text: 'Update' }]);

            await getProgressHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Progress history retrieved', data: [{ update_text: 'Update' }] });
        });
    });
});
