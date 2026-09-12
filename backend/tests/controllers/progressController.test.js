const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

const { logProgress, getProgressHistory } = require('../../controllers/progressController');

describe('Progress Express Controller', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { email: 'user@example.com', teamId: 'team123' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logProgress', () => {
        it('returns 400 when validation fails', async () => {
            req.body = { teamId: '', updateText: 'Testing', deltaPercentage: 10 };
            await logProgress(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
        });

        it('returns 403 when user does not own project', async () => {
            req.user = { email: 'user@example.com', teamId: 'otherTeam' };
            req.body = { teamId: 'team123', updateText: 'Testing', deltaPercentage: 10 };
            await logProgress(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Forbidden') }));
        });

        it('returns 201 Created on success', async () => {
            req.body = { teamId: 'team123', updateText: 'Finished step 1', deltaPercentage: 15 };
            mockLogProgress.mockResolvedValueOnce({ timestamp: '2026-03-01T12:00:00.000Z' });

            await logProgress(req, res);

            expect(mockLogProgress).toHaveBeenCalledWith('team123', 'Finished step 1', 15);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress update logged successfully',
                timestamp: '2026-03-01T12:00:00.000Z'
            });
        });

        it('returns 500 when progress service fails', async () => {
            req.body = { teamId: 'team123', updateText: 'Finished step 1', deltaPercentage: 15 };
            mockLogProgress.mockRejectedValueOnce(new Error('Service failure'));

            await logProgress(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });

    describe('getProgressHistory', () => {
        it('returns 400 if teamId param is missing', async () => {
            req.params = {};
            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
        });

        it('returns 403 if user does not own project', async () => {
            req.params = { teamId: 'team123' };
            req.user = { email: 'user@example.com', teamId: 'differentTeam' };
            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('returns 200 with progress logs on success', async () => {
            req.params = { teamId: 'team123' };
            const logs = [{ PK: 'PROJ#team123', SK: 'LOG#2026-03-01', update_text: 'Update 1', delta_percentage: 10 }];
            mockGetProgressLogs.mockResolvedValueOnce(logs);

            await getProgressHistory(req, res);

            expect(mockGetProgressLogs).toHaveBeenCalledWith('team123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(logs);
        });

        it('returns 500 if service throws error', async () => {
            req.params = { teamId: 'team123' };
            mockGetProgressLogs.mockRejectedValueOnce(new Error('Service error'));

            await getProgressHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });
});
