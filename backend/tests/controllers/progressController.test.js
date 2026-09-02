const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockCheckProjectOwnership = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs,
}));

jest.mock('../../utils/auth', () => ({
    checkProjectOwnership: mockCheckProjectOwnership,
}));

const { logProgressUpdate, getProgressHistory } = require('../../controllers/progressController');

describe('Progress Controller', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { _id: 'user_1', email: 'user1@example.com' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('logProgressUpdate', () => {
        test('should return 400 for invalid body payload', async () => {
            req.body = { teamId: 'proj_1', deltaPercentage: 10 }; // missing updateText
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: expect.stringContaining('updateText') });
        });

        test('should return 403 when user does not own project', async () => {
            req.body = { teamId: 'proj_unowned', updateText: 'Testing', deltaPercentage: 10 };
            mockCheckProjectOwnership.mockResolvedValue(false);

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: Access denied for this project' });
        });

        test('should return 201 when update is successful', async () => {
            req.body = { teamId: 'proj_1', updateText: 'Completed task', deltaPercentage: 15 };
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress update logged successfully',
                data: { success: true, timestamp: '2026-03-01T00:00:00.000Z' }
            });
        });

        test('should return 500 on unexpected exception', async () => {
            req.body = { teamId: 'proj_1', updateText: 'Completed task', deltaPercentage: 15 };
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockRejectedValue(new Error('Database error'));

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });

    describe('getProgressHistory', () => {
        test('should return 400 if teamId param is missing', async () => {
            req.params = {};
            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'teamId parameter is required' });
        });

        test('should return 403 if checkProjectOwnership fails', async () => {
            req.params = { teamId: 'proj_2' };
            mockCheckProjectOwnership.mockResolvedValue(false);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: Access denied for this project' });
        });

        test('should return 200 with progress history logs', async () => {
            req.params = { teamId: 'proj_1' };
            const mockLogs = [{ SK: 'LOG#1', update_text: 'Log 1' }];
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockLogs);
        });
    });
});
