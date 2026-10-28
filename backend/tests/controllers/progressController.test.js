const mockGetProjectById = jest.fn();
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock('../../services/dynamoService', () => ({
    getProjectById: mockGetProjectById
}));

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

const { logUpdate, getHistory } = require('../../controllers/progressController');

describe('Express Progress Controller', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { email: 'team@test.com', teamId: 'proj_100' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    test('logUpdate returns 400 on invalid input', async () => {
        req.body = { teamId: '', updateText: '' };
        await logUpdate(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('logUpdate returns 404 when project not found', async () => {
        req.body = { teamId: 'proj_100', updateText: 'Log text', deltaPercentage: 5 };
        mockGetProjectById.mockResolvedValueOnce(null);

        await logUpdate(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
    });

    test('logUpdate returns 403 on ownership mismatch', async () => {
        req.body = { teamId: 'proj_200', updateText: 'Log text', deltaPercentage: 5 };
        mockGetProjectById.mockResolvedValueOnce({ _id: 'proj_200', teamId: 'proj_200' });

        await logUpdate(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('logUpdate returns 201 on success', async () => {
        req.body = { teamId: 'proj_100', updateText: 'Log text', deltaPercentage: 10 };
        mockGetProjectById.mockResolvedValueOnce({ _id: 'proj_100', teamId: 'proj_100' });
        mockLogProgress.mockResolvedValueOnce({ success: true, timestamp: '2026-02-28T00:00:00Z' });

        await logUpdate(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Progress update logged successfully',
            data: { success: true, timestamp: '2026-02-28T00:00:00Z' }
        });
    });

    test('getHistory returns 200 on success', async () => {
        req.params = { teamId: 'proj_100' };
        mockGetProjectById.mockResolvedValueOnce({ _id: 'proj_100', teamId: 'proj_100' });
        mockGetProgressLogs.mockResolvedValueOnce([{ update_text: 'Done', delta_percentage: 20 }]);

        await getHistory(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            teamId: 'proj_100',
            logs: [{ update_text: 'Done', delta_percentage: 20 }]
        });
    });
});
