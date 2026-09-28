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

const { logProgressUpdate, getHistoryLogs } = require('../../controllers/progressController');

describe('Express Progress Controller', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            params: {},
            user: null
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    describe('logProgressUpdate', () => {
        test('should return 400 if validation fails', async () => {
            req.body = { teamId: '', updateText: 'test', deltaPercentage: 10 };
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('should return 404 if project is not found', async () => {
            req.body = { teamId: 'proj_1', updateText: 'test', deltaPercentage: 10 };
            req.user = { _id: 'proj_1', email: 'owner@example.com' };
            mockGetProjectById.mockResolvedValue(null);

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        test('should return 403 if unauthorized user attempts update', async () => {
            req.body = { teamId: 'proj_1', updateText: 'test', deltaPercentage: 10 };
            req.user = { _id: 'user_other', email: 'other@example.com' };
            mockGetProjectById.mockResolvedValue({ _id: 'proj_1', teamId: 'proj_1', ownerEmail: 'owner@example.com' });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized for this project' });
        });

        test('should return 201 Created on valid progress update', async () => {
            req.body = { teamId: 'proj_1', updateText: 'Express route update', deltaPercentage: 20 };
            req.user = { _id: 'proj_1', email: 'owner@example.com' };
            mockGetProjectById.mockResolvedValue({ _id: 'proj_1', teamId: 'proj_1', ownerEmail: 'owner@example.com' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress updated successfully',
                success: true,
                timestamp: '2026-03-01T00:00:00.000Z'
            });
        });

        test('should return 500 on server error', async () => {
            req.body = { teamId: 'proj_1', updateText: 'test', deltaPercentage: 10 };
            req.user = { _id: 'proj_1', email: 'owner@example.com' };
            mockGetProjectById.mockRejectedValue(new Error('DB failure'));

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });

    describe('getHistoryLogs', () => {
        test('should return 404 if project is missing', async () => {
            req.params = { teamId: 'proj_1' };
            req.user = { _id: 'proj_1', email: 'owner@example.com' };
            mockGetProjectById.mockResolvedValue(null);

            await getHistoryLogs(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('should return 200 OK with history logs', async () => {
            req.params = { teamId: 'proj_1' };
            req.user = { _id: 'proj_1', email: 'owner@example.com' };
            mockGetProjectById.mockResolvedValue({ _id: 'proj_1', teamId: 'proj_1', ownerEmail: 'owner@example.com' });
            mockGetProgressLogs.mockResolvedValue([{ SK: 'LOG#2026-03-01' }]);

            await getHistoryLogs(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true, logs: [{ SK: 'LOG#2026-03-01' }] });
        });
    });
});
