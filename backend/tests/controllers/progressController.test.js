jest.mock('../../services/progressService', () => ({
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
}));

jest.mock('../../services/dynamoService', () => ({
    getUser: jest.fn(),
    getProjectById: jest.fn()
}));

const { logProgress, getProgressLogs } = require('../../services/progressService');
const dynamoService = require('../../services/dynamoService');
const { logUpdateController, getHistoryController } = require('../../controllers/progressController');

describe('Express Controller: progressController.js', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { email: 'user@test.com', role: 'user', loginEmail: 'user@test.com' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('logUpdateController', () => {
        it('should return 400 for invalid validation data', async () => {
            req.body = { teamId: '', updateText: '' };
            await logUpdateController(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 if project not found for non-admin', async () => {
            req.body = { teamId: 'proj999', updateText: 'Testing', deltaPercentage: 10 };
            dynamoService.getProjectById.mockResolvedValue(null);

            await logUpdateController(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        it('should return 403 if user is not project owner or member', async () => {
            req.body = { teamId: 'proj123', updateText: 'Testing', deltaPercentage: 10 };
            dynamoService.getProjectById.mockResolvedValue({
                _id: 'proj123',
                userEmail: 'owner@test.com',
                PK: 'USER#owner@test.com'
            });

            await logUpdateController(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('should return 201 when project update is logged successfully', async () => {
            req.body = { teamId: 'proj123', updateText: 'Completed setup', deltaPercentage: 15 };
            req.user.email = 'owner@test.com';
            dynamoService.getProjectById.mockResolvedValue({
                _id: 'proj123',
                userEmail: 'owner@test.com',
                PK: 'USER#owner@test.com'
            });
            logProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });

            await logUpdateController(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(logProgress).toHaveBeenCalledWith('proj123', 'Completed setup', 15);
        });
    });

    describe('getHistoryController', () => {
        it('should return 400 if teamId is missing', async () => {
            req.params = { teamId: ' ' };
            await getHistoryController(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 200 with history logs for admin', async () => {
            req.params = { teamId: 'proj123' };
            req.user.role = 'admin';
            getProgressLogs.mockResolvedValue([
                { update_text: 'Initial update', delta_percentage: 10 }
            ]);

            await getHistoryController(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress history retrieved successfully',
                data: [{ update_text: 'Initial update', delta_percentage: 10 }]
            });
        });
    });
});
