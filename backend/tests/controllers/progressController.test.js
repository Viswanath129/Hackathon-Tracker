const mockCheckProjectOwnership = jest.fn();
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

jest.mock('../../utils/auth', () => ({
    checkProjectOwnership: mockCheckProjectOwnership
}));

const { logProgressUpdate, getProgressHistory } = require('../../controllers/progressController');

describe('Express Progress Controller (controllers/progressController.js)', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { _id: 'user1', email: 'user@example.com', role: 'user' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logProgressUpdate', () => {
        it('returns 400 when input validation fails', async () => {
            req.body = { teamId: '', updateText: 'test', deltaPercentage: 10 };
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'teamId must be a non-empty string' });
        });

        it('returns 403 when user fails ownership verification', async () => {
            req.body = { teamId: 'proj1', updateText: 'test', deltaPercentage: 10 };
            mockCheckProjectOwnership.mockResolvedValue(false);

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: Access denied for this project' });
        });

        it('returns 201 Created on successful update log', async () => {
            req.body = { teamId: 'proj1', updateText: 'Progress updated', deltaPercentage: 20 };
            mockCheckProjectOwnership.mockResolvedValue(true);
            const timestamp = new Date().toISOString();
            mockLogProgress.mockResolvedValue({ success: true, timestamp });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                timestamp,
                message: 'Progress update logged successfully'
            });
        });

        it('returns 500 when service encounters error', async () => {
            req.body = { teamId: 'proj1', updateText: 'Progress updated', deltaPercentage: 20 };
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockRejectedValue(new Error('Database error'));

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });

    describe('getProgressHistory', () => {
        it('returns 400 when teamId parameter is missing', async () => {
            req.params = { teamId: '' };
            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 403 when user lacks ownership', async () => {
            req.params = { teamId: 'proj1' };
            mockCheckProjectOwnership.mockResolvedValue(false);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('returns 200 OK with logs on success', async () => {
            req.params = { teamId: 'proj1' };
            mockCheckProjectOwnership.mockResolvedValue(true);
            const logs = [{ PK: 'PROJ#proj1', SK: 'LOG#123', update_text: 'Update' }];
            mockGetProgressLogs.mockResolvedValue(logs);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(logs);
        });
    });
});
