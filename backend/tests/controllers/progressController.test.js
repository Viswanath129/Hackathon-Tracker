// Prefix mock variables with 'mock' as per memory rules
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

const { logProgressUpdate, getProgressHistory } = require('../../controllers/progressController');

describe('progressController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { _id: 'user_123', role: 'team' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    test('should return 400 if validation fails', async () => {
        req.body = { teamId: '', updateText: 'Testing', deltaPercentage: 10 };
        await logProgressUpdate(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: expect.stringContaining('teamId') });
    });

    test('should return 400 if deltaPercentage is a boolean', async () => {
        req.body = { teamId: 'proj_123', updateText: 'Testing', deltaPercentage: true };
        await logProgressUpdate(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: expect.stringContaining('boolean') });
    });

    test('should return 404 if project is not found', async () => {
        req.body = { teamId: 'proj_nonexistent', updateText: 'Testing', deltaPercentage: 10 };
        mockGetProjectById.mockResolvedValue(null);
        await logProgressUpdate(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
    });

    test('should return 403 if project does not belong to user and user is not admin (BOLA)', async () => {
        req.body = { teamId: 'proj_123', updateText: 'Testing', deltaPercentage: 10 };
        mockGetProjectById.mockResolvedValue({ _id: 'proj_123', team_id: 'user_different' });
        await logProgressUpdate(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
    });

    test('should log progress successfully if user is owner', async () => {
        req.body = { teamId: 'proj_123', updateText: 'Testing', deltaPercentage: 10 };
        mockGetProjectById.mockResolvedValue({ _id: 'proj_123', team_id: 'user_123' });
        mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28' });

        await logProgressUpdate(req, res);

        expect(mockLogProgress).toHaveBeenCalledWith('proj_123', 'Testing', 10);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ success: true, timestamp: '2026-02-28' });
    });

    test('should log progress successfully if user is admin even if not owner', async () => {
        req.user = { _id: 'admin_123', role: 'admin' };
        req.body = { teamId: 'proj_123', updateText: 'Testing', deltaPercentage: 10 };
        mockGetProjectById.mockResolvedValue({ _id: 'proj_123', team_id: 'user_different' });
        mockLogProgress.mockResolvedValue({ success: true });

        await logProgressUpdate(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
    });

    test('should retrieve progress history successfully', async () => {
        req.params = { teamId: 'proj_123' };
        mockGetProjectById.mockResolvedValue({ _id: 'proj_123', team_id: 'user_123' });
        mockGetProgressLogs.mockResolvedValue([{ log: 1 }]);

        await getProgressHistory(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith([{ log: 1 }]);
    });
});
