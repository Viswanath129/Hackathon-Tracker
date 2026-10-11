const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockGetProjectById = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

jest.mock('../../services/dynamoService', () => ({
    getProjectById: mockGetProjectById
}));

const { logUpdate, getHistory } = require('../../controllers/progressController');

describe('Express Progress Controller', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = { body: {}, params: {}, user: { _id: 'user1' } };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logUpdate', () => {
        it('should return 400 when validation fails', async () => {
            req.body = { teamId: '', updateText: 'test', deltaPercentage: 10 };
            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 if project is not found or user is not authorized', async () => {
            req.body = { teamId: 'p1', updateText: 'valid update', deltaPercentage: 10 };
            mockGetProjectById.mockResolvedValue(null);

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        it('should return 201 Created on successful progress logging', async () => {
            req.body = { teamId: 'p1', updateText: 'valid update', deltaPercentage: 10 };
            mockGetProjectById.mockResolvedValue({ _id: 'p1', team_id: 'user1' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Progress update logged successfully',
                success: true
            }));
        });
    });

    describe('getHistory', () => {
        it('should return 404 when project not found', async () => {
            req.params = { teamId: 'p1' };
            mockGetProjectById.mockResolvedValue(null);

            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        it('should return 200 OK with progress history logs', async () => {
            req.params = { teamId: 'p1' };
            const logs = [{ update_text: 'Log 1', delta_percentage: 15 }];
            mockGetProjectById.mockResolvedValue({ _id: 'p1', team_id: 'user1' });
            mockGetProgressLogs.mockResolvedValue(logs);

            await getHistory(req, res);
            expect(res.json).toHaveBeenCalledWith(logs);
        });
    });
});
