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

const { logProgressUpdate, getProgressHistory } = require('../../controllers/progressController');

describe('Express Controllers - Progress', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            user: { _id: 'user_1', email: 'user@test.com', role: 'user' },
            body: {},
            params: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logProgressUpdate', () => {
        it('should return 201 on valid request', async () => {
            mockReq.body = { teamId: 'proj_1', updateText: 'Testing controller', deltaPercentage: 20 };
            mockGetProjectById.mockResolvedValue({ _id: 'proj_1', team_id: 'user_1', type: 'PROJECT' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });

            await logProgressUpdate(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Progress update logged successfully'
            }));
        });

        it('should return 400 for invalid input', async () => {
            mockReq.body = { teamId: '', updateText: 'Testing controller', deltaPercentage: 20 };

            await logProgressUpdate(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 if project is not found', async () => {
            mockReq.body = { teamId: 'proj_999', updateText: 'Testing controller', deltaPercentage: 20 };
            mockGetProjectById.mockResolvedValue(null);

            await logProgressUpdate(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('should return 403 if unauthorized user attempts update (BOLA check)', async () => {
            mockReq.user = { _id: 'user_attacker', email: 'attacker@test.com', role: 'user' };
            mockReq.body = { teamId: 'proj_1', updateText: 'Testing controller', deltaPercentage: 20 };
            mockGetProjectById.mockResolvedValue({ _id: 'proj_1', team_id: 'user_1', type: 'PROJECT' });

            await logProgressUpdate(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
        });
    });

    describe('getProgressHistory', () => {
        it('should return 200 with logs for authorized user', async () => {
            mockReq.params = { teamId: 'proj_1' };
            mockGetProjectById.mockResolvedValue({ _id: 'proj_1', team_id: 'user_1', type: 'PROJECT' });
            mockGetProgressLogs.mockResolvedValue([{ update_text: 'Update 1', delta_percentage: 10 }]);

            await getProgressHistory(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({ update_text: 'Update 1' })
            ]));
        });

        it('should return 404 if project is not found', async () => {
            mockReq.params = { teamId: 'proj_999' };
            mockGetProjectById.mockResolvedValue(null);

            await getProgressHistory(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });
    });
});
