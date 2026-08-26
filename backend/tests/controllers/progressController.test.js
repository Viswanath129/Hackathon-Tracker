const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockCheckProjectOwnership = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

jest.mock('../../utils/auth', () => ({
    checkProjectOwnership: mockCheckProjectOwnership
}));

const { logProgressUpdate, getProgressHistory } = require('../../controllers/progressController');

describe('Express Progress Controller', () => {
    let mockReq, mockRes;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            user: { _id: 'user_1', email: 'team@example.com', role: 'team' },
            body: {},
            params: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logProgressUpdate', () => {
        test('returns 201 Created on successful update', async () => {
            mockReq.body = {
                teamId: 'proj_1',
                updateText: 'Backend API complete',
                deltaPercentage: 15
            };
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T12:00:00.000Z' });

            await logProgressUpdate(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Progress update logged successfully',
                timestamp: '2026-03-01T12:00:00.000Z'
            });
            expect(mockLogProgress).toHaveBeenCalledWith('proj_1', 'Backend API complete', 15);
        });

        test('returns 400 Bad Request if validation fails', async () => {
            mockReq.body = {
                teamId: 'proj_1',
                updateText: 'Backend API complete',
                deltaPercentage: true // Boolean rejected
            };

            await logProgressUpdate(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'deltaPercentage must be a numeric value' });
        });

        test('returns 403 Forbidden on BOLA verification failure', async () => {
            mockReq.body = {
                teamId: 'proj_unowned',
                updateText: 'Backend API complete',
                deltaPercentage: 15
            };
            mockCheckProjectOwnership.mockResolvedValue(false);

            await logProgressUpdate(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Forbidden: Access to this project is not authorized' });
        });

        test('returns 500 Internal Server Error on unexpected error', async () => {
            mockReq.body = {
                teamId: 'proj_1',
                updateText: 'Backend API complete',
                deltaPercentage: 15
            };
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockRejectedValue(new Error('Service Failure'));

            await logProgressUpdate(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });

    describe('getProgressHistory', () => {
        test('returns 200 OK on successful fetch', async () => {
            mockReq.params = { teamId: 'proj_1' };
            const mockLogs = [{ PK: 'PROJ#proj_1', SK: 'LOG#1', update_text: 'Sprint 1' }];
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            await getProgressHistory(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(mockLogs);
        });

        test('returns 403 Forbidden on BOLA verification failure', async () => {
            mockReq.params = { teamId: 'proj_unowned' };
            mockCheckProjectOwnership.mockResolvedValue(false);

            await getProgressHistory(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Forbidden: Access to this project is not authorized' });
        });

        test('returns 500 Internal Server Error on internal error', async () => {
            mockReq.params = { teamId: 'proj_1' };
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockGetProgressLogs.mockRejectedValue(new Error('Dynamo Error'));

            await getProgressHistory(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });
});
