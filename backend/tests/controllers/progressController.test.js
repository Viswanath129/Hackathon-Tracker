const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockCheckProjectOwnership = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args)
}));

jest.mock('../../utils/auth', () => ({
    checkProjectOwnership: (...args) => mockCheckProjectOwnership(...args)
}));

const { logUpdate, getHistory } = require('../../controllers/progressController');

describe('progressController', () => {
    let mockReq, mockRes;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            body: {},
            params: {},
            user: { _id: 'user_123', email: 'user@test.com' }
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logUpdate', () => {
        test('returns 400 when validation fails', async () => {
            mockReq.body = { teamId: '', updateText: 'Task', deltaPercentage: 10 };

            await logUpdate(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
        });

        test('returns 403 when BOLA ownership check fails', async () => {
            mockReq.body = { teamId: 'proj_999', updateText: 'Task', deltaPercentage: 10 };
            mockCheckProjectOwnership.mockResolvedValue(false);

            await logUpdate(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Forbidden: Unauthorized access to project' });
        });

        test('returns 201 when logging progress succeeds', async () => {
            mockReq.body = { teamId: 'proj_123', updateText: 'Task update', deltaPercentage: 15 };
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });

            await logUpdate(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Progress update logged successfully',
                success: true,
                timestamp: '2026-03-01T00:00:00.000Z'
            }));
        });
    });

    describe('getHistory', () => {
        test('returns 403 when BOLA ownership check fails', async () => {
            mockReq.params = { teamId: 'proj_999' };
            mockCheckProjectOwnership.mockResolvedValue(false);

            await getHistory(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Forbidden: Unauthorized access to project' });
        });

        test('returns 200 with logs on success', async () => {
            mockReq.params = { teamId: 'proj_123' };
            mockCheckProjectOwnership.mockResolvedValue(true);
            const mockLogs = [{ SK: 'LOG#2026-03-01', update_text: 'Update 1', delta_percentage: 10 }];
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            await getHistory(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(mockLogs);
        });
    });
});
