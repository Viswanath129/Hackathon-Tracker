const mockProgressService = {
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
};

const mockDynamoService = {
    getProjectById: jest.fn()
};

jest.mock('../../services/progressService', () => mockProgressService);
jest.mock('../../services/dynamoService', () => mockDynamoService);

const { logUpdate, getHistory } = require('../../controllers/progressController');

describe('Express Progress Controller', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { email: 'user@example.com', teamId: 'proj123' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('logUpdate Express controller', () => {
        it('returns 400 for missing teamId', async () => {
            req.body = { updateText: 'Updated', deltaPercentage: 10 };
            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 404 if project is not found', async () => {
            req.body = { teamId: 'proj999', updateText: 'Updated', deltaPercentage: 10 };
            mockDynamoService.getProjectById.mockResolvedValue(null);

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        it('returns 201 on success', async () => {
            req.body = { teamId: 'proj123', updateText: 'Completed setup', deltaPercentage: 50 };
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj123', teamId: 'proj123' });
            mockProgressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress update logged successfully',
                data: { success: true, timestamp: '2026-03-01T00:00:00.000Z' }
            });
        });
    });

    describe('getHistory Express controller', () => {
        it('returns 404 if project not found', async () => {
            req.params = { teamId: 'proj999' };
            mockDynamoService.getProjectById.mockResolvedValue(null);

            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('returns 200 with logs on success', async () => {
            req.params = { teamId: 'proj123' };
            const logs = [{ update_text: 'Log 1', delta_percentage: 15 }];
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj123', teamId: 'proj123', email: 'user@example.com' });
            mockProgressService.getProgressLogs.mockResolvedValue(logs);

            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress history retrieved successfully',
                data: logs
            });
        });
    });
});
