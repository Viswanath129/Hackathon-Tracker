const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockGetAllProjects = jest.fn();
const mockGetUser = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

jest.mock('../../services/dynamoService', () => ({
    getAllProjects: mockGetAllProjects,
    getUser: mockGetUser
}));

const { logUpdate, getHistory } = require('../../controllers/progressController');

describe('Progress Express Controller', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { email: 'user@example.com', role: 'user' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('logUpdate', () => {
        it('should return 400 when validation fails', async () => {
            req.body = { teamId: '', updateText: '' };
            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Validation failed' }));
        });

        it('should return 403 when user is not authorized', async () => {
            req.body = { teamId: 'team1', updateText: 'Testing controller', deltaPercentage: 10 };
            mockGetAllProjects.mockResolvedValue([{ _id: 'team1', userEmail: 'other@example.com' }]);

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: Access denied to project' });
        });

        it('should return 201 Created on successful progress logging', async () => {
            req.body = { teamId: 'team1', updateText: 'Testing controller', deltaPercentage: 10 };
            mockGetAllProjects.mockResolvedValue([{ _id: 'team1', userEmail: 'user@example.com' }]);
            mockLogProgress.mockResolvedValue({ success: true });

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress update logged successfully',
                data: { success: true }
            });
        });
    });

    describe('getHistory', () => {
        it('should return 200 OK with progress history logs', async () => {
            req.params = { teamId: 'team1' };
            mockGetAllProjects.mockResolvedValue([{ _id: 'team1', userEmail: 'user@example.com' }]);
            mockGetProgressLogs.mockResolvedValue([{ update_text: 'Log 1' }]);

            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                teamId: 'team1',
                logs: [{ update_text: 'Log 1' }]
            });
        });
    });
});
