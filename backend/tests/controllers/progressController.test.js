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

describe('Express Controller - progressController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { teamId: 'team123', email: 'user@test.com', role: 'user' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('logUpdate', () => {
        test('returns 400 if validation fails', async () => {
            req.body = { teamId: 'team123', updateText: '', deltaPercentage: 10 };
            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
        });

        test('returns 404 if project is not found', async () => {
            req.body = { teamId: 'team123', updateText: 'Doing task', deltaPercentage: 10 };
            mockDynamoService.getProjectById.mockResolvedValue(null);
            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        test('returns 404 on BOLA authorization failure', async () => {
            req.body = { teamId: 'team456', updateText: 'Doing task', deltaPercentage: 10 };
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'team456', teamId: 'team456', type: 'PROJECT' });
            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('returns 201 Created on successful progress logging', async () => {
            req.body = { teamId: 'team123', updateText: 'Doing task', deltaPercentage: 10 };
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'team123', teamId: 'team123', type: 'PROJECT' });
            mockProgressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00Z' });

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(mockProgressService.logProgress).toHaveBeenCalledWith('team123', 'Doing task', 10);
        });

        test('returns 500 on internal error', async () => {
            req.body = { teamId: 'team123', updateText: 'Doing task', deltaPercentage: 10 };
            mockDynamoService.getProjectById.mockRejectedValue(new Error('Internal database failure'));

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });

    describe('getHistory', () => {
        test('returns 404 if project not found', async () => {
            req.params = { teamId: 'team123' };
            mockDynamoService.getProjectById.mockResolvedValue(null);

            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('returns 200 OK with history logs', async () => {
            req.params = { teamId: 'team123' };
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'team123', teamId: 'team123', type: 'PROJECT' });
            const mockLogs = [{ update_text: 'Log item', delta_percentage: 5 }];
            mockProgressService.getProgressLogs.mockResolvedValue(mockLogs);

            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockLogs);
        });
    });
});
