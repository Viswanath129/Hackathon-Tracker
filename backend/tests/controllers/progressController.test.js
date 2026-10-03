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

describe('Progress Express Controllers', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = { body: {}, params: {}, user: { _id: 'user1' } };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logProgressUpdate', () => {
        test('should return 400 if validation fails', async () => {
            req.body = { teamId: '', updateText: '' };
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('should return 404 if project not found', async () => {
            req.body = { teamId: 'p1', updateText: 'test', deltaPercentage: 10 };
            mockGetProjectById.mockResolvedValue(null);
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('should return 403 if user is not authorized', async () => {
            req.body = { teamId: 'p1', updateText: 'test', deltaPercentage: 10 };
            mockGetProjectById.mockResolvedValue({ _id: 'p1', teamId: 'otherUser' });
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('should return 201 on success', async () => {
            req.body = { teamId: 'p1', updateText: 'test', deltaPercentage: 10 };
            mockGetProjectById.mockResolvedValue({ _id: 'p1', teamId: 'user1' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00Z' });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Progress update logged successfully' }));
        });
    });

    describe('getProgressHistory', () => {
        test('should return 404 if project not found', async () => {
            req.params = { teamId: 'p1' };
            mockGetProjectById.mockResolvedValue(null);
            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('should return 200 with data on success', async () => {
            req.params = { teamId: 'p1' };
            mockGetProjectById.mockResolvedValue({ _id: 'p1', teamId: 'user1' });
            mockGetProgressLogs.mockResolvedValue([{ update_text: 'test', delta_percentage: 10 }]);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ data: [{ update_text: 'test', delta_percentage: 10 }] });
        });
    });
});
