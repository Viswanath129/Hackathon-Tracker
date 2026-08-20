const mockDynamoService = {
    getProjectById: jest.fn()
};

const mockProgressService = {
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
};

jest.mock('../../services/dynamoService', () => mockDynamoService);
jest.mock('../../services/progressService', () => mockProgressService);

const { logUpdate, getHistory } = require('../../controllers/progressController');

describe('Express progressController', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            params: {},
            user: { _id: 'user_1', email: 'user@test.com', role: 'user' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    describe('logUpdate', () => {
        test('returns 400 when validation fails', async () => {
            req.body = { teamId: '', updateText: 'test', deltaPercentage: 10 };
            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
        });

        test('returns 403 when BOLA check fails', async () => {
            req.body = { teamId: 'p1', updateText: 'test', deltaPercentage: 10 };
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'p1', team_id: 'other_user' });

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: BOLA check failed' });
        });

        test('returns 201 Created on successful progress update', async () => {
            req.body = { teamId: 'p1', updateText: 'test', deltaPercentage: 10 };
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'p1', team_id: 'user_1' });
            mockProgressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });
        });

        test('returns 500 when logProgress throws error', async () => {
            req.body = { teamId: 'p1', updateText: 'test', deltaPercentage: 10 };
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'p1', team_id: 'user_1' });
            mockProgressService.logProgress.mockRejectedValue(new Error('Database error'));

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });

    describe('getHistory', () => {
        test('returns 400 when teamId parameter is missing', async () => {
            req.params = {};
            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 200 OK with progress history logs', async () => {
            req.params = { teamId: 'p1' };
            const logs = [{ PK: 'PROJ#p1', SK: 'LOG#1', update_text: 'Update 1' }];
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'p1', team_id: 'user_1' });
            mockProgressService.getProgressLogs.mockResolvedValue(logs);

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(logs);
        });

        test('returns 500 when getProgressLogs fails', async () => {
            req.params = { teamId: 'p1' };
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'p1', team_id: 'user_1' });
            mockProgressService.getProgressLogs.mockRejectedValue(new Error('Database error'));

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });
});
