const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockGetProjectById = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args)
}));

jest.mock('../../services/dynamoService', () => ({
    getProjectById: (...args) => mockGetProjectById(...args)
}));

const { logProgressUpdate, getProgressHistory } = require('../../controllers/progressController');

describe('Express Progress Controller', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            user: { _id: 'user123', email: 'user@example.com' },
            body: {},
            params: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('logProgressUpdate', () => {
        it('returns 400 for invalid body payload', async () => {
            req.body = { teamId: '', updateText: 'test', deltaPercentage: 10 };
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 404 when project does not exist', async () => {
            req.body = { teamId: 'proj404', updateText: 'Update note', deltaPercentage: 15 };
            mockGetProjectById.mockResolvedValue(null);

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        it('returns 403 on BOLA unauthorized access', async () => {
            req.body = { teamId: 'proj123', updateText: 'Update note', deltaPercentage: 15 };
            mockGetProjectById.mockResolvedValue({ _id: 'proj123', team_id: 'other_user' });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('returns 201 Created on successful update', async () => {
            req.body = { teamId: 'proj123', updateText: 'Updated auth flow', deltaPercentage: 20 };
            mockGetProjectById.mockResolvedValue({ _id: 'proj123', team_id: 'user123' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28' });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(mockLogProgress).toHaveBeenCalledWith('proj123', 'Updated auth flow', 20);
        });
    });

    describe('getProgressHistory', () => {
        it('returns 404 when project is not found', async () => {
            req.params = { teamId: 'proj404' };
            mockGetProjectById.mockResolvedValue(null);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('returns 200 OK with progress history logs', async () => {
            req.params = { teamId: 'proj123' };
            mockGetProjectById.mockResolvedValue({ _id: 'proj123', team_id: 'user123' });
            mockGetProgressLogs.mockResolvedValue([{ log: 1 }]);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ logs: [{ log: 1 }] });
        });
    });
});
