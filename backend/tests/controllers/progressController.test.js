const mockProgressService = {
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
};

const mockDynamoService = {
    getProjectById: jest.fn(),
    saveProject: jest.fn()
};

jest.mock('../../services/progressService', () => mockProgressService);
jest.mock('../../services/dynamoService', () => mockDynamoService);

const { logProgressUpdate, getProgressHistory } = require('../../controllers/progressController');

describe('progressController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { _id: 'user_1', role: 'user', email: 'team1@test.com' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('logProgressUpdate', () => {
        it('returns 400 for invalid payload', async () => {
            req.body = { teamId: '' };
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 403 when BOLA check fails', async () => {
            req.body = { teamId: 'proj_1', updateText: 'Step 1', deltaPercentage: 10 };
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj_1', team_id: 'user_other' });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: You do not have permission to access this project' });
        });

        it('returns 201 on success and updates project percentage', async () => {
            req.body = { teamId: 'proj_1', updateText: 'Step 1', deltaPercentage: 15 };
            const mockProj = { _id: 'proj_1', team_id: 'user_1', hackathon_id: 'hack_1', progress_percentage: 20 };
            mockDynamoService.getProjectById.mockResolvedValue(mockProj);
            mockProgressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00Z' });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(mockProgressService.logProgress).toHaveBeenCalledWith('proj_1', 'Step 1', 15);
            expect(mockDynamoService.saveProject).toHaveBeenCalledWith('hack_1', expect.objectContaining({ progress_percentage: 35 }));
        });
    });

    describe('getProgressHistory', () => {
        it('returns 403 when BOLA check fails', async () => {
            req.params = { teamId: 'proj_1' };
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj_1', team_id: 'user_other' });

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('returns 200 with logs on success', async () => {
            req.params = { teamId: 'proj_1' };
            const mockProj = { _id: 'proj_1', team_id: 'user_1' };
            mockDynamoService.getProjectById.mockResolvedValue(mockProj);
            const mockLogs = [{ update_text: 'Log 1', delta_percentage: 10 }];
            mockProgressService.getProgressLogs.mockResolvedValue(mockLogs);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockLogs);
        });
    });
});
