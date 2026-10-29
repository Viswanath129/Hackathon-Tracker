const mockDynamoService = {
    getProjectById: jest.fn(),
    saveProgressLog: jest.fn(),
    getProgressLogs: jest.fn()
};

jest.mock('../../services/dynamoService', () => mockDynamoService);

const { logProgressUpdate, getProgressHistory } = require('../../controllers/progressController');

describe('progressController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { _id: 'team123', role: 'team' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logProgressUpdate', () => {
        test('returns 400 for invalid body', async () => {
            req.body = { teamId: '', updateText: '', deltaPercentage: 200 };
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 404 if project is not found', async () => {
            req.body = { teamId: 'team123', updateText: 'Log test', deltaPercentage: 10 };
            mockDynamoService.getProjectById.mockResolvedValue(null);

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('returns 403 if user is not authorized for project (BOLA)', async () => {
            req.body = { teamId: 'otherTeam', updateText: 'Log test', deltaPercentage: 10 };
            mockDynamoService.getProjectById.mockResolvedValue({
                _id: 'otherTeam',
                teamId: 'otherTeam',
                PK: 'HACK#h1'
            });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('returns 201 Created on successful progress logging', async () => {
            req.body = { teamId: 'team123', updateText: 'Log test', deltaPercentage: 10 };
            mockDynamoService.getProjectById.mockResolvedValue({
                _id: 'proj1',
                teamId: 'team123'
            });
            mockDynamoService.saveProgressLog.mockResolvedValue({
                _id: 'log1',
                updateText: 'Log test',
                deltaPercentage: 10
            });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.any(String),
                data: expect.objectContaining({ _id: 'log1' })
            }));
        });
    });

    describe('getProgressHistory', () => {
        test('returns 404 if project not found', async () => {
            req.params.teamId = 'team123';
            mockDynamoService.getProjectById.mockResolvedValue(null);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('returns 200 OK with progress history', async () => {
            req.params.teamId = 'team123';
            mockDynamoService.getProjectById.mockResolvedValue({
                _id: 'proj1',
                teamId: 'team123'
            });
            mockDynamoService.getProgressLogs.mockResolvedValue([
                { _id: 'log1', updateText: 'Initial' }
            ]);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.arrayContaining([{ _id: 'log1', updateText: 'Initial' }])
            }));
        });
    });
});
