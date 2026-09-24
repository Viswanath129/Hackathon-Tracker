const mockGetProjectById = jest.fn();
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock('../../services/dynamoService', () => ({
    getProjectById: (...args) => mockGetProjectById(...args)
}));

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args)
}));

const { logUpdate, getHistory } = require('../../controllers/progressController');

describe('Express progressController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { _id: 'user_1', email: 'team1@test.com' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logUpdate', () => {
        it('should return 400 if validation fails', async () => {
            req.body = { teamId: '', updateText: 'test', deltaPercentage: 10 };
            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('teamId')
            }));
        });

        it('should return 404 if project is not found', async () => {
            req.body = { teamId: 'p_99', updateText: 'valid update', deltaPercentage: 20 };
            mockGetProjectById.mockResolvedValue(null);

            await logUpdate(req, res);

            expect(mockGetProjectById).toHaveBeenCalledWith('p_99');
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        it('should return 403 if project ownership authorization fails (BOLA check)', async () => {
            req.body = { teamId: 'p_1', updateText: 'valid update', deltaPercentage: 20 };
            mockGetProjectById.mockResolvedValue({
                _id: 'p_1',
                teamEmail: 'other@test.com',
                teamId: 'other_user'
            });

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('Forbidden')
            }));
        });

        it('should return 201 on successful progress update logging', async () => {
            req.body = { teamId: 'p_1', updateText: 'valid update', deltaPercentage: 20 };
            mockGetProjectById.mockResolvedValue({
                _id: 'p_1',
                teamEmail: 'team1@test.com'
            });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });

            await logUpdate(req, res);

            expect(mockLogProgress).toHaveBeenCalledWith('p_1', 'valid update', 20);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress update logged successfully',
                timestamp: '2026-02-28T00:00:00.000Z'
            });
        });

        it('should return 500 on internal service failure', async () => {
            req.body = { teamId: 'p_1', updateText: 'valid update', deltaPercentage: 20 };
            mockGetProjectById.mockRejectedValue(new Error('DynamoDB Error'));

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });

    describe('getHistory', () => {
        it('should return 400 if teamId param is missing', async () => {
            req.params = { teamId: '  ' };
            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'teamId is required' });
        });

        it('should return 404 if project is not found', async () => {
            req.params = { teamId: 'p_99' };
            mockGetProjectById.mockResolvedValue(null);

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        it('should return 403 if project ownership check fails', async () => {
            req.params = { teamId: 'p_1' };
            mockGetProjectById.mockResolvedValue({
                _id: 'p_1',
                teamEmail: 'different@test.com'
            });

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('should return 200 with progress logs on success', async () => {
            req.params = { teamId: 'p_1' };
            mockGetProjectById.mockResolvedValue({
                _id: 'p_1',
                teamEmail: 'team1@test.com'
            });
            const mockLogs = [{ update_text: 'Log 1', delta_percentage: 10 }];
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            await getHistory(req, res);

            expect(mockGetProgressLogs).toHaveBeenCalledWith('p_1');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockLogs);
        });
    });
});
