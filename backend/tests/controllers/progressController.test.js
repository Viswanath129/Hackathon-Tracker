const mockProgressService = {
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
};
const mockDynamoService = {
    getProjectById: jest.fn()
};

jest.mock('../../services/progressService', () => mockProgressService);
jest.mock('../../services/dynamoService', () => mockDynamoService);

const { logProgressUpdate, getProgressHistory } = require('../../controllers/progressController');

describe('Progress Controller (Express)', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { _id: 'user1', email: 'user@example.com' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logProgressUpdate', () => {
        it('should return 400 if validation fails', async () => {
            req.body = { teamId: '', updateText: '' };
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'teamId must be a non-empty string' });
        });

        it('should return 404 if project is not found', async () => {
            req.body = { teamId: 'nonexistent', updateText: 'Update', deltaPercentage: 10 };
            mockDynamoService.getProjectById.mockResolvedValue(null);

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        it('should return 403 if project ownership check fails', async () => {
            req.body = { teamId: 'proj1', updateText: 'Update', deltaPercentage: 10 };
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj1', teamId: 'otherUser' });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: You do not own this project' });
        });

        it('should return 201 Created on successful progress update', async () => {
            req.body = { teamId: 'proj1', updateText: 'Update', deltaPercentage: 10 };
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj1', teamId: 'user1' });
            mockProgressService.logProgress.mockResolvedValue({ success: true });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress logged successfully',
                result: { success: true }
            });
        });
    });

    describe('getProgressHistory', () => {
        it('should return 404 if project is not found', async () => {
            req.params = { teamId: 'nonexistent' };
            mockDynamoService.getProjectById.mockResolvedValue(null);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        it('should return 200 OK with progress history logs', async () => {
            req.params = { teamId: 'proj1' };
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj1', teamId: 'user1' });
            const logs = [{ update_text: 'Done' }];
            mockProgressService.getProgressLogs.mockResolvedValue(logs);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ logs });
        });
    });
});
