const mockGetProjectById = jest.fn();
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock('../../services/dynamoService', () => ({
    getProjectById: mockGetProjectById
}));

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

const { logUpdate, getHistory } = require('../../controllers/progressController');

describe('Express Progress Controller', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { _id: 'proj_1', teamId: 'proj_1', role: 'team' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logUpdate Express Controller', () => {
        test('should return 400 if req.body is missing or invalid', async () => {
            req.body = null;
            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Request body is required' });
        });

        test('should return 400 if validation fails', async () => {
            req.body = { teamId: 'proj_1', updateText: 'Log', deltaPercentage: 'invalid' };
            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'deltaPercentage must be a number between -100 and 100' });
        });

        test('should return 404 if project is not found', async () => {
            req.body = { teamId: 'proj_1', updateText: 'Log text', deltaPercentage: 10 };
            mockGetProjectById.mockResolvedValue(null);

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        test('should return 404 for BOLA access attempt', async () => {
            req.body = { teamId: 'proj_999', updateText: 'Log text', deltaPercentage: 10 };
            req.user = { _id: 'proj_1', teamId: 'proj_1', role: 'team' };
            mockGetProjectById.mockResolvedValue({ _id: 'proj_999', teamId: 'proj_999' });

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        test('should return 201 Created on successful progress update log', async () => {
            req.body = { teamId: 'proj_1', updateText: 'Express log completed', deltaPercentage: 20 };
            const timestamp = new Date().toISOString();
            mockGetProjectById.mockResolvedValue({ _id: 'proj_1', teamId: 'proj_1' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp });

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress update logged successfully',
                timestamp
            });
        });

        test('should return 500 on internal exception', async () => {
            req.body = { teamId: 'proj_1', updateText: 'Log', deltaPercentage: 10 };
            mockGetProjectById.mockRejectedValue(new Error('Internal Exception'));

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });

    describe('getHistory Express Controller', () => {
        test('should return 200 OK with logs for owner', async () => {
            req.params = { teamId: 'proj_1' };
            const mockLogs = [{ update_text: 'Done', delta_percentage: 10 }];
            mockGetProjectById.mockResolvedValue({ _id: 'proj_1', teamId: 'proj_1' });
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockLogs);
        });

        test('should return 404 if project not found', async () => {
            req.params = { teamId: 'proj_missing' };
            mockGetProjectById.mockResolvedValue(null);

            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });
    });
});
