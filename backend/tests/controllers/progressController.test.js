const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockCheckProjectOwnership = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

jest.mock('../../utils/auth', () => ({
    checkProjectOwnership: mockCheckProjectOwnership
}));

const { logProgressUpdate, getHistory } = require('../../controllers/progressController');

describe('Express progressController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { _id: 'user_1', email: 'user@example.com', role: 'user' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logProgressUpdate', () => {
        test('returns 400 for invalid body payload', async () => {
            req.body = { teamId: '', updateText: 'test', deltaPercentage: 10 };
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
        });

        test('returns 403 when project ownership check fails (BOLA)', async () => {
            req.body = { teamId: 'proj_123', updateText: 'test log', deltaPercentage: 10 };
            mockCheckProjectOwnership.mockResolvedValue(false);

            await logProgressUpdate(req, res);

            expect(mockCheckProjectOwnership).toHaveBeenCalledWith(req.user, 'proj_123');
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: Access denied for this project' });
        });

        test('returns 201 Created on successful progress logging', async () => {
            req.body = { teamId: 'proj_123', updateText: 'test log', deltaPercentage: 10 };
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockResolvedValue({ timestamp: '2026-03-01T12:00:00.000Z' });

            await logProgressUpdate(req, res);

            expect(mockLogProgress).toHaveBeenCalledWith('proj_123', 'test log', 10);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress update logged successfully',
                timestamp: '2026-03-01T12:00:00.000Z'
            });
        });

        test('returns 500 when progress service throws an error', async () => {
            req.body = { teamId: 'proj_123', updateText: 'test log', deltaPercentage: 10 };
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockRejectedValue(new Error('Database error'));

            await logProgressUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });

    describe('getHistory', () => {
        test('returns 400 if teamId param is missing', async () => {
            req.params = { teamId: '' };
            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 403 when ownership check fails', async () => {
            req.params = { teamId: 'proj_123' };
            mockCheckProjectOwnership.mockResolvedValue(false);

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('returns 200 OK with progress history logs', async () => {
            req.params = { teamId: 'proj_123' };
            mockCheckProjectOwnership.mockResolvedValue(true);
            const mockLogs = [{ SK: 'LOG#1', update_text: 'Done', delta_percentage: 15 }];
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            await getHistory(req, res);

            expect(mockGetProgressLogs).toHaveBeenCalledWith('proj_123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockLogs);
        });
    });
});
