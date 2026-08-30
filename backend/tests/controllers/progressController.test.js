const mockAuthService = {
    checkProjectOwnership: jest.fn()
};
const mockProgressService = {
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
};

jest.mock('../../utils/auth', () => mockAuthService);
jest.mock('../../services/progressService', () => mockProgressService);

const { logProgressUpdate, getProgressHistory } = require('../../controllers/progressController');

describe('Progress Express Controller', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { _id: 'user_123', email: 'user@test.com' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('logProgressUpdate', () => {
        test('should return 400 on invalid input', async () => {
            req.body = { teamId: '', updateText: '' };
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('should return 403 on BOLA check failure', async () => {
            req.body = { teamId: 'proj_123', updateText: 'Log', deltaPercentage: 10 };
            mockAuthService.checkProjectOwnership.mockResolvedValue(false);

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: Access denied for this project' });
        });

        test('should return 201 on success', async () => {
            req.body = { teamId: 'proj_123', updateText: 'Log', deltaPercentage: 10 };
            mockAuthService.checkProjectOwnership.mockResolvedValue(true);
            mockProgressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(mockProgressService.logProgress).toHaveBeenCalledWith('proj_123', 'Log', 10);
        });
    });

    describe('getProgressHistory', () => {
        test('should return 400 when teamId parameter is missing', async () => {
            req.params = {};
            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('should return 403 on BOLA check failure', async () => {
            req.params = { teamId: 'proj_123' };
            mockAuthService.checkProjectOwnership.mockResolvedValue(false);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('should return 200 with logs on success', async () => {
            req.params = { teamId: 'proj_123' };
            mockAuthService.checkProjectOwnership.mockResolvedValue(true);
            const logs = [{ update_text: 'Test', delta_percentage: 5 }];
            mockProgressService.getProgressLogs.mockResolvedValue(logs);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(logs);
        });
    });
});
