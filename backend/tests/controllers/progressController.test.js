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

describe('Express Controller - Progress', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { _id: 'user_1', email: 'user@example.com', role: 'team' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logProgressUpdate', () => {
        test('should return 400 when validation fails', async () => {
            req.body = { teamId: '', updateText: 'Text', deltaPercentage: 10 };
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
        });

        test('should return 404 when project does not exist', async () => {
            req.body = { teamId: 'proj_999', updateText: 'Text', deltaPercentage: 10 };
            mockDynamoService.getProjectById.mockResolvedValue(null);

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        test('should return 403 when user does not own project', async () => {
            req.body = { teamId: 'proj_123', updateText: 'Text', deltaPercentage: 10 };
            req.user = { _id: 'user_other', role: 'team' };
            mockDynamoService.getProjectById.mockResolvedValue({
                _id: 'proj_123',
                team_id: 'user_owner'
            });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: Access denied to project' });
        });

        test('should return 201 when owner logs progress', async () => {
            req.body = { teamId: 'proj_123', updateText: 'Text', deltaPercentage: 10 };
            req.user = { _id: 'user_owner', role: 'team' };
            mockDynamoService.getProjectById.mockResolvedValue({
                _id: 'proj_123',
                team_id: 'user_owner'
            });
            mockProgressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00Z' });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(mockProgressService.logProgress).toHaveBeenCalledWith('proj_123', 'Text', 10);
        });

        test('should return 201 when admin logs progress', async () => {
            req.body = { teamId: 'proj_123', updateText: 'Text', deltaPercentage: 10 };
            req.user = { _id: 'admin_1', role: 'admin' };
            mockDynamoService.getProjectById.mockResolvedValue({
                _id: 'proj_123',
                team_id: 'user_owner'
            });
            mockProgressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00Z' });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe('getProgressHistory', () => {
        test('should return 400 when teamId param is missing', async () => {
            req.params = {};
            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('should return 200 with logs on success', async () => {
            req.params = { teamId: 'proj_123' };
            req.user = { _id: 'user_owner', role: 'team' };
            mockDynamoService.getProjectById.mockResolvedValue({
                _id: 'proj_123',
                team_id: 'user_owner'
            });
            const mockLogs = [{ PK: 'PROJ#proj_123', update_text: 'Log 1' }];
            mockProgressService.getProgressLogs.mockResolvedValue(mockLogs);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockLogs);
        });
    });
});
