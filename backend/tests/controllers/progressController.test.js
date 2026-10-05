const { logUpdate, getHistory } = require('../../controllers/progressController');
const dynamoService = require('../../services/dynamoService');
const progressService = require('../../services/progressService');

jest.mock('../../services/dynamoService');
jest.mock('../../services/progressService');

describe('Express progressController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { _id: 'user123', email: 'user@example.com' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('logUpdate', () => {
        it('should return 400 when progress input validation fails', async () => {
            req.body = { teamId: '', updateText: '' };

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
        });

        it('should return 404 when project is not found', async () => {
            req.body = { teamId: 'proj999', updateText: 'Progress updated', deltaPercentage: 20 };
            dynamoService.getProjectById.mockResolvedValue(null);

            await logUpdate(req, res);

            expect(dynamoService.getProjectById).toHaveBeenCalledWith('proj999');
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        it('should return 403 when user is not authorized for the project', async () => {
            req.body = { teamId: 'proj123', updateText: 'Progress updated', deltaPercentage: 20 };
            dynamoService.getProjectById.mockResolvedValue({ _id: 'proj123', teamId: 'otherUser' });

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: Access denied' });
        });

        it('should return 201 Created on successful progress logging', async () => {
            req.body = { teamId: 'proj123', updateText: 'Progress updated', deltaPercentage: 20 };
            dynamoService.getProjectById.mockResolvedValue({ _id: 'proj123', teamId: 'user123' });
            progressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T12:00:00.000Z' });

            await logUpdate(req, res);

            expect(progressService.logProgress).toHaveBeenCalledWith('proj123', 'Progress updated', 20);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Progress logged successfully', success: true }));
        });
    });

    describe('getHistory', () => {
        it('should return 404 when project is not found', async () => {
            req.params = { teamId: 'proj999' };
            dynamoService.getProjectById.mockResolvedValue(null);

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        it('should return 403 when user is not authorized for the project', async () => {
            req.params = { teamId: 'proj123' };
            dynamoService.getProjectById.mockResolvedValue({ _id: 'proj123', teamId: 'otherUser' });

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: Access denied' });
        });

        it('should return 200 OK with progress history logs', async () => {
            req.params = { teamId: 'proj123' };
            const mockLogs = [{ SK: 'LOG#2026', update_text: 'Done', delta_percentage: 10 }];
            dynamoService.getProjectById.mockResolvedValue({ _id: 'proj123', teamId: 'user123' });
            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            await getHistory(req, res);

            expect(progressService.getProgressLogs).toHaveBeenCalledWith('proj123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockLogs);
        });
    });
});
