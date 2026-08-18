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

describe('Express progressController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { _id: 'user1', email: 'user1@test.com', role: 'user' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logUpdate', () => {
        test('returns 400 if validation fails', async () => {
            req.body = { teamId: '', updateText: 'Text', deltaPercentage: 10 };
            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 404 if project is not found', async () => {
            req.body = { teamId: 'proj1', updateText: 'Text', deltaPercentage: 10 };
            mockGetProjectById.mockResolvedValue(null);

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        test('returns 403 if user is not project owner or admin (BOLA)', async () => {
            req.body = { teamId: 'proj1', updateText: 'Text', deltaPercentage: 10 };
            req.user = { _id: 'user2', email: 'user2@test.com', role: 'user' };
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', team_id: 'user1' });

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('returns 201 on success', async () => {
            req.body = { teamId: 'proj1', updateText: 'Text', deltaPercentage: 10 };
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', team_id: 'user1' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress update logged successfully',
                timestamp: '2026-03-01T00:00:00.000Z'
            });
        });
    });

    describe('getHistory', () => {
        test('returns 400 if teamId param is missing', async () => {
            req.params = {};
            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 200 and history logs', async () => {
            req.params = { teamId: 'proj1' };
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', team_id: 'user1' });
            const mockLogs = [{ SK: 'LOG#1', update_text: 'Log 1' }];
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockLogs);
        });
    });
});
