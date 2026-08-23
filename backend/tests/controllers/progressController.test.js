const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockCheckProjectOwnership = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args),
}));

jest.mock('../../utils/auth', () => ({
    checkProjectOwnership: (...args) => mockCheckProjectOwnership(...args),
}));

const { logUpdate, getHistory } = require('../../controllers/progressController');

describe('Progress Controller (Express)', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            user: { _id: 'user123', email: 'user@example.com', role: 'user' },
            body: {},
            params: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    });

    describe('logUpdate', () => {
        it('should return 400 for invalid payload (missing teamId)', async () => {
            req.body = { updateText: 'Progress update', deltaPercentage: 10 };

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: expect.stringContaining('teamId') });
        });

        it('should return 400 for boolean deltaPercentage', async () => {
            req.body = { teamId: 'proj123', updateText: 'Progress update', deltaPercentage: true };

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: expect.stringContaining('deltaPercentage') });
        });

        it('should return 403 when user does not own project (BOLA failure)', async () => {
            req.body = { teamId: 'proj123', updateText: 'Progress update', deltaPercentage: 10 };
            mockCheckProjectOwnership.mockResolvedValue(false);

            await logUpdate(req, res);

            expect(mockCheckProjectOwnership).toHaveBeenCalledWith(req.user, 'proj123');
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: Access denied to this project' });
        });

        it('should return 201 Created on successful progress update', async () => {
            req.body = { teamId: 'proj123', updateText: 'Built API endpoints', deltaPercentage: 25 };
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T12:00:00.000Z' });

            await logUpdate(req, res);

            expect(mockCheckProjectOwnership).toHaveBeenCalledWith(req.user, 'proj123');
            expect(mockLogProgress).toHaveBeenCalledWith('proj123', 'Built API endpoints', 25);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress update logged successfully',
                timestamp: '2026-03-01T12:00:00.000Z',
            });
        });

        it('should return 500 on service error', async () => {
            req.body = { teamId: 'proj123', updateText: 'Built API endpoints', deltaPercentage: 25 };
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockRejectedValue(new Error('DynamoDB Error'));

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });

    describe('getHistory', () => {
        it('should return 400 if teamId param is missing', async () => {
            req.params = { teamId: '' };

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'teamId parameter is required' });
        });

        it('should return 403 if project ownership check fails', async () => {
            req.params = { teamId: 'proj123' };
            mockCheckProjectOwnership.mockResolvedValue(false);

            await getHistory(req, res);

            expect(mockCheckProjectOwnership).toHaveBeenCalledWith(req.user, 'proj123');
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: Access denied to this project' });
        });

        it('should return 200 OK with history logs on success', async () => {
            req.params = { teamId: 'proj123' };
            const mockLogs = [{ SK: 'LOG#2026-03-01T12:00:00.000Z', update_text: 'Update 1', delta_percentage: 10 }];
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            await getHistory(req, res);

            expect(mockCheckProjectOwnership).toHaveBeenCalledWith(req.user, 'proj123');
            expect(mockGetProgressLogs).toHaveBeenCalledWith('proj123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockLogs);
        });

        it('should return 500 on service error', async () => {
            req.params = { teamId: 'proj123' };
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockGetProgressLogs.mockRejectedValue(new Error('Query Error'));

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });
});
