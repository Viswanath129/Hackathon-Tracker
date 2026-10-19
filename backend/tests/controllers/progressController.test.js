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

describe('Express Progress Controller', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { _id: 'team_1', email: 'team1@test.com' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logProgressUpdate', () => {
        it('should return 400 for invalid validation input', async () => {
            req.body = { teamId: 'proj_1', updateText: '', deltaPercentage: 10 };
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 if project is not found', async () => {
            req.body = { teamId: 'proj_nonexistent', updateText: 'Update text', deltaPercentage: 15 };
            mockDynamoService.getProjectById.mockResolvedValue(null);

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        it('should return 403 if ownership check fails', async () => {
            req.body = { teamId: 'proj_1', updateText: 'Update text', deltaPercentage: 15 };
            req.user = { _id: 'team_2', email: 'team2@test.com' };
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj_1', team_id: 'team_1' });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: Access denied' });
        });

        it('should return 201 on success', async () => {
            req.body = { teamId: 'proj_1', updateText: 'Update text', deltaPercentage: 15 };
            req.user = { _id: 'team_1', email: 'team1@test.com' };
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj_1', team_id: 'team_1' });
            mockProgressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T12:00:00Z' });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(mockProgressService.logProgress).toHaveBeenCalledWith('proj_1', 'Update text', 15);
        });

        it('should return 500 on unexpected error', async () => {
            req.body = { teamId: 'proj_1', updateText: 'Update text', deltaPercentage: 15 };
            mockDynamoService.getProjectById.mockRejectedValue(new Error('Unexpected'));

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });

    describe('getProgressHistory', () => {
        it('should return 404 if project not found', async () => {
            req.params = { teamId: 'proj_404' };
            mockDynamoService.getProjectById.mockResolvedValue(null);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should return 403 if ownership check fails', async () => {
            req.params = { teamId: 'proj_1' };
            req.user = { _id: 'team_2' };
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj_1', team_id: 'team_1' });

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('should return 200 with history logs', async () => {
            req.params = { teamId: 'proj_1' };
            req.user = { _id: 'team_1' };
            const mockLogs = [{ update_text: 'Log 1', delta_percentage: 10 }];
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj_1', team_id: 'team_1' });
            mockProgressService.getProgressLogs.mockResolvedValue(mockLogs);

            await getProgressHistory(req, res);
            expect(res.json).toHaveBeenCalledWith(mockLogs);
        });
    });
});
