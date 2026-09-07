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

describe('Express Controller: progressController.js', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { email: 'team@test.com', _id: 'team_1', role: 'team' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logUpdate', () => {
        it('returns status 400 if validation fails', async () => {
            req.body = { teamId: '', updateText: 'Hello', deltaPercentage: 10 };

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('teamId is required')
            }));
        });

        it('returns status 403 if user lacks project ownership', async () => {
            req.body = { teamId: 'proj_other', updateText: 'Valid', deltaPercentage: 10 };
            mockCheckProjectOwnership.mockResolvedValue(false);

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('Forbidden')
            }));
        });

        it('returns status 201 on successful update', async () => {
            req.body = { teamId: 'proj_1', updateText: 'Valid update', deltaPercentage: 25 };
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00Z' });

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Progress update logged successfully',
                data: { success: true, timestamp: '2026-03-01T00:00:00Z' }
            }));
            expect(mockLogProgress).toHaveBeenCalledWith('proj_1', 'Valid update', 25);
        });

        it('returns status 500 when service throws an error', async () => {
            req.body = { teamId: 'proj_1', updateText: 'Valid update', deltaPercentage: 25 };
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockRejectedValue(new Error('Internal database failure'));

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });

    describe('getHistory', () => {
        it('returns status 400 if teamId is missing', async () => {
            req.params = {};

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'teamId parameter is required' });
        });

        it('returns status 403 if ownership check fails', async () => {
            req.params = { teamId: 'proj_1' };
            mockCheckProjectOwnership.mockResolvedValue(false);

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('Forbidden')
            }));
        });

        it('returns status 200 with history logs', async () => {
            req.params = { teamId: 'proj_1' };
            const mockLogs = [{ SK: 'LOG#1', update_text: 'Test', delta_percentage: 5 }];
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ history: mockLogs });
            expect(mockGetProgressLogs).toHaveBeenCalledWith('proj_1');
        });

        it('returns status 500 on service exception', async () => {
            req.params = { teamId: 'proj_1' };
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockGetProgressLogs.mockRejectedValue(new Error('Failed to query logs'));

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });
});
