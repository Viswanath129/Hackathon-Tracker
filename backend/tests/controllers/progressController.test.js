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

describe('Express Progress Controllers', () => {
    let req, res;
    const mockUser = { teamId: 'team123', email: 'team@example.com', role: 'team' };
    const mockProject = { _id: 'team123', teamId: 'team123', type: 'PROJECT' };

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            user: mockUser,
            body: {},
            params: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logProgressUpdate controller', () => {
        it('should return 400 if validation fails', async () => {
            req.body = { teamId: '', updateText: 'Testing', deltaPercentage: 10 };
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'teamId must be a non-empty string' });
        });

        it('should return 400 if deltaPercentage is boolean', async () => {
            req.body = { teamId: 'team123', updateText: 'Testing', deltaPercentage: false };
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'deltaPercentage cannot be a boolean' });
        });

        it('should return 404 if project is not found', async () => {
            req.body = { teamId: 'team123', updateText: 'Testing', deltaPercentage: 10 };
            mockGetProjectById.mockResolvedValue(null);
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        it('should return 403 if project ownership check fails', async () => {
            req.body = { teamId: 'team123', updateText: 'Testing', deltaPercentage: 10 };
            mockGetProjectById.mockResolvedValue({ _id: 'otherTeam', teamId: 'otherTeam' });
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: Access denied' });
        });

        it('should return 201 Created on success', async () => {
            req.body = { teamId: 'team123', updateText: 'Testing', deltaPercentage: 10 };
            mockGetProjectById.mockResolvedValue(mockProject);
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress update logged successfully',
                data: { success: true, timestamp: '2026-02-28T00:00:00.000Z' }
            });
        });
    });

    describe('getProgressHistory controller', () => {
        it('should return 400 if teamId param is missing', async () => {
            req.params = {};
            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 if project is not found', async () => {
            req.params = { teamId: 'team123' };
            mockGetProjectById.mockResolvedValue(null);
            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should return 403 if ownership check fails', async () => {
            req.params = { teamId: 'team123' };
            mockGetProjectById.mockResolvedValue({ _id: 'otherTeam', teamId: 'otherTeam' });
            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('should return 200 OK on success', async () => {
            req.params = { teamId: 'team123' };
            mockGetProjectById.mockResolvedValue(mockProject);
            mockGetProgressLogs.mockResolvedValue([
                { timestamp: '2026-02-28T00:00:00.000Z', update_text: 'Update 1', delta_percentage: 10 }
            ]);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress logs retrieved successfully',
                data: [{ timestamp: '2026-02-28T00:00:00.000Z', update_text: 'Update 1', delta_percentage: 10 }]
            });
        });
    });
});
