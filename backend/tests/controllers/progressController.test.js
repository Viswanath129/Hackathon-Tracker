const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockCheckProjectOwnership = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args)
}));

jest.mock('../../utils/auth', () => ({
    checkProjectOwnership: (...args) => mockCheckProjectOwnership(...args)
}));

const { logProgressUpdate, getProgressHistory } = require('../../controllers/progressController');

describe('Progress Express Controller', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { _id: 'user_1', email: 'user@test.com' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logProgressUpdate', () => {
        test('should return 400 when payload is invalid', async () => {
            req.body = { teamId: '', updateText: 'Valid', deltaPercentage: 10 };
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('should return 403 when user does not own project', async () => {
            req.body = { teamId: 'proj_2', updateText: 'Valid update', deltaPercentage: 10 };
            mockCheckProjectOwnership.mockResolvedValue(false);

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/Forbidden/) }));
        });

        test('should return 201 on success', async () => {
            req.body = { teamId: 'proj_1', updateText: 'Valid update', deltaPercentage: 15 };
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00Z' });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Progress update logged successfully' }));
        });

        test('should return 500 when progressService throws an error', async () => {
            req.body = { teamId: 'proj_1', updateText: 'Valid update', deltaPercentage: 15 };
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockRejectedValue(new Error('Database write error'));

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Database write error' });
        });
    });

    describe('getProgressHistory', () => {
        test('should return 400 when teamId param is missing', async () => {
            req.params = {};
            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('should return 403 when BOLA ownership check fails', async () => {
            req.params = { teamId: 'proj_forbidden' };
            mockCheckProjectOwnership.mockResolvedValue(false);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('should return 200 with history logs', async () => {
            req.params = { teamId: 'proj_1' };
            const mockLogs = [{ update_text: 'Log 1', delta_percentage: 10 }];
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockLogs);
        });
    });
});
