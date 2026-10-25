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

describe('Progress Controller (Express)', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { _id: 'user1', email: 'user@example.com', role: 'user' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('logProgressUpdate', () => {
        test('returns 400 when input validation fails', async () => {
            req.body = { teamId: 'proj123', deltaPercentage: 10 }; // updateText missing
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'updateText must be a non-empty string' });
        });

        test('returns 404 when project is not found', async () => {
            req.body = { teamId: 'proj123', updateText: 'Step 1', deltaPercentage: 10 };
            mockGetProjectById.mockResolvedValue(null);

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        test('returns 403 when user does not own project', async () => {
            req.body = { teamId: 'proj123', updateText: 'Step 1', deltaPercentage: 10 };
            mockGetProjectById.mockResolvedValue({ _id: 'proj123', team_id: 'other_user' });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: You do not have access to this project' });
        });

        test('returns 201 Created on successful progress logging', async () => {
            req.body = { teamId: 'proj123', updateText: 'Step 1', deltaPercentage: 10 };
            mockGetProjectById.mockResolvedValue({ _id: 'proj123', team_id: 'user1' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress update logged successfully',
                data: { success: true, timestamp: '2026-02-28T00:00:00.000Z' }
            });
        });
    });

    describe('getProgressHistory', () => {
        test('returns 404 when project is not found', async () => {
            req.params = { teamId: 'proj123' };
            mockGetProjectById.mockResolvedValue(null);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        test('returns 200 OK with progress history logs', async () => {
            req.params = { teamId: 'proj123' };
            const logs = [{ update_text: 'Step 1', delta_percentage: 10 }];
            mockGetProjectById.mockResolvedValue({ _id: 'proj123', team_id: 'user1' });
            mockGetProgressLogs.mockResolvedValue(logs);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(logs);
        });
    });
});
