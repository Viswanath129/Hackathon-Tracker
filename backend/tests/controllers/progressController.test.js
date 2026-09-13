const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args)
}));

const { logProgressUpdate, getProgressHistory } = require('../../controllers/progressController');

describe('Express Progress Controller', () => {
    let req, res;

    beforeEach(() => {
        req = { body: {}, params: {}, user: null };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    describe('logProgressUpdate Controller', () => {
        test('should return 400 when input validation fails', async () => {
            req.body = { teamId: '', updateText: 'valid', deltaPercentage: 10 };

            await logProgressUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'teamId must be a non-empty string' });
        });

        test('should return 403 on BOLA / ownership mismatch', async () => {
            req.user = { teamId: 'PROJ#999', role: 'team' };
            req.body = { teamId: 'PROJ#100', updateText: 'Testing BOLA', deltaPercentage: 10 };

            await logProgressUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden: You do not have permission for this project' });
        });

        test('should return 201 Created on successful log update', async () => {
            req.user = { teamId: 'PROJ#100', role: 'team' };
            req.body = { teamId: 'PROJ#100', updateText: 'Milestone 1 completed', deltaPercentage: 15 };
            mockLogProgress.mockResolvedValueOnce({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });

            await logProgressUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress update logged successfully',
                data: { success: true, timestamp: '2026-02-28T00:00:00.000Z' }
            });
            expect(mockLogProgress).toHaveBeenCalledWith('PROJ#100', 'Milestone 1 completed', 15);
        });

        test('should return 500 when service fails', async () => {
            req.user = { teamId: 'PROJ#100', role: 'team' };
            req.body = { teamId: 'PROJ#100', updateText: 'Milestone 1 completed', deltaPercentage: 15 };
            mockLogProgress.mockRejectedValueOnce(new Error('Database error'));

            await logProgressUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
        });
    });

    describe('getProgressHistory Controller', () => {
        test('should return 400 if teamId param is missing', async () => {
            req.params = {};
            req.user = { teamId: 'PROJ#100', role: 'team' };

            await getProgressHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('should return 403 on BOLA / ownership mismatch', async () => {
            req.params = { teamId: 'PROJ#100' };
            req.user = { teamId: 'PROJ#999', role: 'team' };

            await getProgressHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('should return 200 OK with progress history logs', async () => {
            req.params = { teamId: 'PROJ#100' };
            req.user = { teamId: 'PROJ#100', role: 'team' };
            const fakeLogs = [{ SK: 'LOG#123', update_text: 'Started project', delta_percentage: 5 }];
            mockGetProgressLogs.mockResolvedValueOnce(fakeLogs);

            await getProgressHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: fakeLogs
            });
            expect(mockGetProgressLogs).toHaveBeenCalledWith('PROJ#100');
        });
    });
});
