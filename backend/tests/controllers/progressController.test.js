const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockGetProjectById = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

jest.mock('../../services/dynamoService', () => ({
    getProjectById: mockGetProjectById
}));

const { logProgressUpdate, getProgressHistory } = require('../../controllers/progressController');

describe('progressController', () => {
    let mockReq, mockRes;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            body: {},
            params: {},
            user: { teamId: 'team_1', role: 'user' }
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('logProgressUpdate', () => {
        test('should log progress update successfully for valid input and ownership', async () => {
            mockReq.body = {
                teamId: 'proj_100',
                updateText: 'Completed module',
                deltaPercentage: 15
            };
            mockGetProjectById.mockResolvedValue({ _id: 'proj_100', teamId: 'team_1' });
            mockLogProgress.mockResolvedValue({ timestamp: '2026-03-01T00:00:00Z' });

            await logProgressUpdate(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Progress update logged successfully',
                projectId: 'proj_100'
            }));
        });

        test('should return 400 for invalid input', async () => {
            mockReq.body = { teamId: '', updateText: 'Invalid', deltaPercentage: 10 };

            await logProgressUpdate(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        test('should return 404 if project does not exist', async () => {
            mockReq.body = { teamId: 'proj_nonexistent', updateText: 'Valid', deltaPercentage: 10 };
            mockGetProjectById.mockResolvedValue(null);

            await logProgressUpdate(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        test('should return 403 if user does not own project', async () => {
            mockReq.body = { teamId: 'proj_other', updateText: 'Valid', deltaPercentage: 10 };
            mockGetProjectById.mockResolvedValue({ _id: 'proj_other', teamId: 'different_team' });

            await logProgressUpdate(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Forbidden: Access denied to project' });
        });

        test('should return 500 on internal service failure', async () => {
            mockReq.body = { teamId: 'proj_100', updateText: 'Valid', deltaPercentage: 10 };
            mockGetProjectById.mockRejectedValue(new Error('DB failure'));

            await logProgressUpdate(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });

    describe('getProgressHistory', () => {
        test('should return progress history for authorized team', async () => {
            mockReq.params = { teamId: 'proj_100' };
            mockGetProjectById.mockResolvedValue({ _id: 'proj_100', teamId: 'team_1' });
            mockGetProgressLogs.mockResolvedValue([{ update_text: 'Log 1', delta_percentage: 10 }]);

            await getProgressHistory(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                projectId: 'proj_100',
                logs: [{ update_text: 'Log 1', delta_percentage: 10 }]
            });
        });

        test('should return 404 if project is missing', async () => {
            mockReq.params = { teamId: 'proj_missing' };
            mockGetProjectById.mockResolvedValue(null);

            await getProgressHistory(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        test('should return 403 if project access is unauthorized', async () => {
            mockReq.params = { teamId: 'proj_other' };
            mockGetProjectById.mockResolvedValue({ _id: 'proj_other', teamId: 'unauthorized_team' });

            await getProgressHistory(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
        });
    });
});
