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

describe('Express progressController', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        jest.clearAllMocks();

        mockReq = {
            body: {},
            params: {},
            user: { _id: 'proj_123', email: 'team@test.com' }
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logProgressUpdate', () => {
        test('returns 400 when input validation fails', async () => {
            mockReq.body = { teamId: 'proj_123', updateText: 'test', deltaPercentage: true }; // boolean invalid

            await logProgressUpdate(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('numeric value')
            }));
        });

        test('returns 404 when project is not found', async () => {
            mockReq.body = { teamId: 'proj_nonexistent', updateText: 'Progress update', deltaPercentage: 10 };
            mockGetProjectById.mockResolvedValue(null);

            await logProgressUpdate(mockReq, mockRes);

            expect(mockGetProjectById).toHaveBeenCalledWith('proj_nonexistent');
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        test('returns 403 when user is not authorized for project', async () => {
            mockReq.body = { teamId: 'proj_123', updateText: 'Progress update', deltaPercentage: 10 };
            mockReq.user = { _id: 'unauthorized_user', email: 'other@test.com' };
            mockGetProjectById.mockResolvedValue({ _id: 'proj_123', email: 'team@test.com' });

            await logProgressUpdate(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('Forbidden')
            }));
        });

        test('returns 201 when progress update is logged successfully', async () => {
            mockReq.body = { teamId: 'proj_123', updateText: 'Progress update', deltaPercentage: 10 };
            mockReq.user = { _id: 'proj_123', email: 'team@test.com' };
            mockGetProjectById.mockResolvedValue({ _id: 'proj_123', email: 'team@test.com' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T10:00:00.000Z' });

            await logProgressUpdate(mockReq, mockRes);

            expect(mockLogProgress).toHaveBeenCalledWith('proj_123', 'Progress update', 10);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Progress update logged successfully'
            }));
        });
    });

    describe('getProgressHistory', () => {
        test('returns 404 when project is not found', async () => {
            mockReq.params = { teamId: 'proj_nonexistent' };
            mockGetProjectById.mockResolvedValue(null);

            await getProgressHistory(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        test('returns 403 when user is unauthorized', async () => {
            mockReq.params = { teamId: 'proj_123' };
            mockReq.user = { _id: 'unauthorized_user', email: 'other@test.com' };
            mockGetProjectById.mockResolvedValue({ _id: 'proj_123', email: 'team@test.com' });

            await getProgressHistory(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        test('returns 200 with logs when request is authorized', async () => {
            mockReq.params = { teamId: 'proj_123' };
            mockReq.user = { _id: 'proj_123', email: 'team@test.com' };
            const mockLogs = [{ update_text: 'Update 1', delta_percentage: 10 }];
            mockGetProjectById.mockResolvedValue({ _id: 'proj_123', email: 'team@test.com' });
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            await getProgressHistory(mockReq, mockRes);

            expect(mockGetProgressLogs).toHaveBeenCalledWith('proj_123');
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(mockLogs);
        });
    });
});
