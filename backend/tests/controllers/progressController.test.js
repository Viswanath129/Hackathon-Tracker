// Mock the services before requiring the controller
const mockGetProjectById = jest.fn();
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock('../../services/dynamoService', () => ({
    getProjectById: (...args) => mockGetProjectById(...args)
}));

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args)
}));

const { logUpdate, getHistory } = require('../../controllers/progressController');

describe('progressController Unit Tests (Express)', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            body: {},
            params: {},
            user: { _id: 'user_123', email: 'test@example.com', role: 'user' }
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logUpdate controller', () => {
        it('should return 400 if validation fails (e.g. missing teamId)', async () => {
            mockReq.body = { updateText: 'Hello', deltaPercentage: 10 }; // Missing teamId
            await logUpdate(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.any(String)
            }));
        });

        it('should return 404 if project is not found', async () => {
            mockReq.body = { teamId: 'proj_nonexistent', updateText: 'Testing', deltaPercentage: 15 };
            mockGetProjectById.mockResolvedValueOnce(null);

            await logUpdate(mockReq, mockRes);

            expect(mockGetProjectById).toHaveBeenCalledWith('proj_nonexistent');
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        it('should return 403 if non-admin user does not own the project', async () => {
            mockReq.body = { teamId: 'proj_other', updateText: 'Testing', deltaPercentage: 15 };
            mockReq.user = { _id: 'user_my_team', role: 'user' };
            mockGetProjectById.mockResolvedValueOnce({ _id: 'proj_other', team_id: 'user_different_team' });

            await logUpdate(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Forbidden: Access denied to this project' });
        });

        it('should log successfully if user owns the project', async () => {
            mockReq.body = { teamId: 'proj_mine', updateText: 'My Project Update', deltaPercentage: 20 };
            mockReq.user = { _id: 'user_my_team', role: 'user' };
            mockGetProjectById.mockResolvedValueOnce({ _id: 'proj_mine', team_id: 'user_my_team' });
            mockLogProgress.mockResolvedValueOnce({ timestamp: '2026-08-09T12:00:00.000Z' });

            await logUpdate(mockReq, mockRes);

            expect(mockLogProgress).toHaveBeenCalledWith('proj_mine', 'My Project Update', 20);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Progress update logged successfully',
                timestamp: '2026-08-09T12:00:00.000Z'
            });
        });

        it('should log successfully if user is an admin even if they do not own the project', async () => {
            mockReq.body = { teamId: 'proj_other', updateText: 'Admin Override Update', deltaPercentage: -5 };
            mockReq.user = { _id: 'user_admin', role: 'admin' };
            mockGetProjectById.mockResolvedValueOnce({ _id: 'proj_other', team_id: 'user_other_team' });
            mockLogProgress.mockResolvedValueOnce({ timestamp: '2026-08-09T12:00:00.000Z' });

            await logUpdate(mockReq, mockRes);

            expect(mockLogProgress).toHaveBeenCalledWith('proj_other', 'Admin Override Update', -5);
            expect(mockRes.status).toHaveBeenCalledWith(201);
        });

        it('should return 500 if an internal service error occurs', async () => {
            mockReq.body = { teamId: 'proj_mine', updateText: 'Error trigger', deltaPercentage: 20 };
            mockReq.user = { _id: 'user_my_team', role: 'user' };
            mockGetProjectById.mockRejectedValueOnce(new Error('Dynamo failure'));

            await logUpdate(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });

    describe('getHistory controller', () => {
        it('should return 400 if teamId is missing', async () => {
            mockReq.params = { teamId: '' };
            await getHistory(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 if project is not found', async () => {
            mockReq.params = { teamId: 'proj_not_found' };
            mockGetProjectById.mockResolvedValueOnce(null);

            await getHistory(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('should return 403 if non-admin user does not own the project', async () => {
            mockReq.params = { teamId: 'proj_other' };
            mockReq.user = { _id: 'user_my_team', role: 'user' };
            mockGetProjectById.mockResolvedValueOnce({ _id: 'proj_other', team_id: 'user_different_team' });

            await getHistory(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it('should return history logs successfully if user owns the project', async () => {
            mockReq.params = { teamId: 'proj_mine' };
            mockReq.user = { _id: 'user_my_team', role: 'user' };
            mockGetProjectById.mockResolvedValueOnce({ _id: 'proj_mine', team_id: 'user_my_team' });
            const mockLogs = [{ update_text: 'Log 1', delta_percentage: 10 }];
            mockGetProgressLogs.mockResolvedValueOnce(mockLogs);

            await getHistory(mockReq, mockRes);

            expect(mockGetProgressLogs).toHaveBeenCalledWith('proj_mine');
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(mockLogs);
        });
    });
});
