const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

const { logUpdate, getHistory } = require('../../controllers/progressController');

describe('Express Progress Controller', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            body: {},
            params: {},
            user: { role: 'admin' }
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logUpdate', () => {
        test('should return 201 Created on successful progress logging', async () => {
            mockReq.body = { teamId: 'proj123', updateText: 'Completed auth', deltaPercentage: 15 };
            mockLogProgress.mockResolvedValueOnce({ success: true, timestamp: '2026-02-28' });

            await logUpdate(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Progress update logged successfully'
            }));
            expect(mockLogProgress).toHaveBeenCalledWith('proj123', 'Completed auth', 15);
        });

        test('should return 400 Bad Request if input validation fails', async () => {
            mockReq.body = { teamId: 'proj123', updateText: '', deltaPercentage: 15 };

            await logUpdate(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockLogProgress).not.toHaveBeenCalled();
        });

        test('should return 403 Forbidden on BOLA mismatch for non-admin user', async () => {
            mockReq.user = { role: 'team', teamId: 'my_team' };
            mockReq.body = { teamId: 'other_team', updateText: 'Valid text', deltaPercentage: 10 };

            await logUpdate(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockLogProgress).not.toHaveBeenCalled();
        });

        test('should return 500 Internal Server Error if service throws', async () => {
            mockReq.body = { teamId: 'proj123', updateText: 'Valid text', deltaPercentage: 10 };
            mockLogProgress.mockRejectedValueOnce(new Error('Database error'));

            await logUpdate(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });

    describe('getHistory', () => {
        test('should return 200 OK with progress history logs', async () => {
            mockReq.params = { teamId: 'proj123' };
            const mockLogs = [{ SK: 'LOG#1', update_text: 'Started', delta_percentage: 5 }];
            mockGetProgressLogs.mockResolvedValueOnce(mockLogs);

            await getHistory(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(mockLogs);
            expect(mockGetProgressLogs).toHaveBeenCalledWith('proj123');
        });

        test('should return 403 Forbidden on BOLA mismatch for non-admin user', async () => {
            mockReq.user = { role: 'team', teamId: 'my_team' };
            mockReq.params = { teamId: 'other_team' };

            await getHistory(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockGetProgressLogs).not.toHaveBeenCalled();
        });

        test('should return 500 Internal Server Error on failure', async () => {
            mockReq.params = { teamId: 'proj123' };
            mockGetProgressLogs.mockRejectedValueOnce(new Error('Query error'));

            await getHistory(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });
});
