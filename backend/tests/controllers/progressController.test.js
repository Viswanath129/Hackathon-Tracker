const mockGetProjectById = jest.fn();
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock('../../services/dynamoService', () => ({
    getProjectById: mockGetProjectById
}));

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

const progressController = require('../../controllers/progressController');

describe('Express Controller - progressController.js', () => {
    let req, res;

    beforeEach(() => {
        mockGetProjectById.mockReset();
        mockLogProgress.mockReset();
        mockGetProgressLogs.mockReset();

        req = {
            body: {},
            params: {},
            user: { teamId: 'team123', email: 'user@test.com' }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logUpdate', () => {
        it('should return 400 Bad Request on invalid input', async () => {
            req.body = { teamId: '', updateText: 'valid', deltaPercentage: 10 };

            await progressController.logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
        });

        it('should return 404 Not Found if project does not exist', async () => {
            req.body = { teamId: 'team123', updateText: 'Update text', deltaPercentage: 20 };
            mockGetProjectById.mockResolvedValueOnce(null);

            await progressController.logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        it('should return 403 Forbidden if user does not own project', async () => {
            req.body = { teamId: 'other_team', updateText: 'Update text', deltaPercentage: 20 };
            req.user = { teamId: 'team123' };
            mockGetProjectById.mockResolvedValueOnce({ teamId: 'other_team' });

            await progressController.logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
        });

        it('should return 201 Created on successful progress update', async () => {
            req.body = { teamId: 'team123', updateText: 'Update text', deltaPercentage: 20 };
            mockGetProjectById.mockResolvedValueOnce({ teamId: 'team123' });
            mockLogProgress.mockResolvedValueOnce({ success: true });

            await progressController.logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ message: 'Progress logged successfully', teamId: 'team123' });
        });
    });

    describe('getHistory', () => {
        it('should return 404 Not Found if project is missing', async () => {
            req.params = { teamId: 'missing_team' };
            mockGetProjectById.mockResolvedValueOnce(null);

            await progressController.getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        it('should return 200 OK with progress history logs', async () => {
            req.params = { teamId: 'team123' };
            mockGetProjectById.mockResolvedValueOnce({ teamId: 'team123' });
            const logs = [{ update_text: 'Update 1', delta_percentage: 10 }];
            mockGetProgressLogs.mockResolvedValueOnce(logs);

            await progressController.getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ logs });
        });
    });
});
