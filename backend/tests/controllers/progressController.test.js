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

describe('Express Controller - Progress', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { email: 'user@test.com', role: 'user' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('logProgressUpdate', () => {
        it('should return 400 if req.body is missing', async () => {
            req.body = null;
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Request body is required' });
        });

        it('should return 400 if validation fails', async () => {
            req.body = { teamId: '', updateText: 'test', deltaPercentage: 10 };
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 403 if project ownership check fails', async () => {
            req.body = { teamId: 'proj1', updateText: 'test update', deltaPercentage: 10 };
            mockCheckProjectOwnership.mockResolvedValue(false);

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(mockCheckProjectOwnership).toHaveBeenCalledWith('proj1', req.user);
        });

        it('should return 201 on successful progress update', async () => {
            req.body = { teamId: 'proj1', updateText: 'test update', deltaPercentage: 10 };
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress update logged successfully',
                data: { success: true, timestamp: '2026-03-01T00:00:00.000Z' }
            });
        });
    });

    describe('getProgressHistory', () => {
        it('should return 400 if teamId param is missing', async () => {
            req.params = { teamId: '' };
            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 200 OK with history logs', async () => {
            req.params = { teamId: 'proj1' };
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockGetProgressLogs.mockResolvedValue([{ update_text: 'Log 1' }]);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress history retrieved successfully',
                data: [{ update_text: 'Log 1' }]
            });
        });
    });
});
