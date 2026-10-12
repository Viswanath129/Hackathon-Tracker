const mockDynamoService = {
    getProjectById: jest.fn()
};

const mockProgressService = {
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
};

jest.mock('../../services/dynamoService', () => mockDynamoService);
jest.mock('../../services/progressService', () => mockProgressService);

const { logProgressUpdate, getProgressHistory } = require('../../controllers/progressController');

describe('Progress Controller', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { _id: 'user_1', teamId: 'proj_123', email: 'test@example.com', role: 'user' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logProgressUpdate', () => {
        test('returns 400 for invalid input', async () => {
            req.body = { teamId: '', updateText: '', deltaPercentage: 'invalid' };
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 404 if project is not found', async () => {
            req.body = { teamId: 'proj_nonexistent', updateText: 'Progress', deltaPercentage: 10 };
            mockDynamoService.getProjectById.mockResolvedValue(null);

            await logProgressUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        test('returns 403 if user is not authorized', async () => {
            req.body = { teamId: 'proj_other', updateText: 'Progress', deltaPercentage: 10 };
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj_other', teamId: 'other_team' });

            await logProgressUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('returns 201 on success', async () => {
            req.body = { teamId: 'proj_123', updateText: 'Progress', deltaPercentage: 10 };
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj_123', teamId: 'proj_123' });
            mockProgressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });

            await logProgressUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Progress update logged successfully'
            }));
        });
    });

    describe('getProgressHistory', () => {
        test('returns 404 if project not found', async () => {
            req.params = { teamId: 'proj_404' };
            mockDynamoService.getProjectById.mockResolvedValue(null);

            await getProgressHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('returns 200 with log history', async () => {
            req.params = { teamId: 'proj_123' };
            const mockLogs = [{ SK: 'LOG#1', update_text: 'Done' }];
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj_123', teamId: 'proj_123' });
            mockProgressService.getProgressLogs.mockResolvedValue(mockLogs);

            await getProgressHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockLogs);
        });
    });
});
