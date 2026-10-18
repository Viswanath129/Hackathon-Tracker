const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockGetProjectById = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args)
}));

jest.mock('../../services/dynamoService', () => ({
    getProjectById: (...args) => mockGetProjectById(...args)
}));

const { logUpdate, getHistory } = require('../../controllers/progressController');

describe('progressController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { teamId: 'team123', role: 'user' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logUpdate', () => {
        test('returns 400 when validation fails', async () => {
            req.body = { teamId: '', updateText: 'test', deltaPercentage: 10 };
            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
        });

        test('returns 404 when project does not exist', async () => {
            req.body = { teamId: 'team123', updateText: 'Update text', deltaPercentage: 15 };
            mockGetProjectById.mockResolvedValue(null);

            await logUpdate(req, res);
            expect(mockGetProjectById).toHaveBeenCalledWith('team123');
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        test('returns 403 when user does not own project', async () => {
            req.body = { teamId: 'team456', updateText: 'Update text', deltaPercentage: 15 };
            req.user = { teamId: 'team123', role: 'user' };
            mockGetProjectById.mockResolvedValue({ _id: 'team456', type: 'PROJECT' });

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: You do not have access to this project' });
        });

        test('returns 201 Created on successful progress logging', async () => {
            req.body = { teamId: 'team123', updateText: 'Implemented feature', deltaPercentage: 20 };
            mockGetProjectById.mockResolvedValue({ _id: 'team123', type: 'PROJECT' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Progress logged successfully'
            }));
        });
    });

    describe('getHistory', () => {
        test('returns 404 when project does not exist', async () => {
            req.params = { teamId: 'team123' };
            mockGetProjectById.mockResolvedValue(null);

            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        test('returns 403 when user does not own project', async () => {
            req.params = { teamId: 'team456' };
            req.user = { teamId: 'team123', role: 'user' };
            mockGetProjectById.mockResolvedValue({ _id: 'team456', type: 'PROJECT' });

            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('returns 200 OK with logs for authorized user', async () => {
            req.params = { teamId: 'team123' };
            mockGetProjectById.mockResolvedValue({ _id: 'team123', type: 'PROJECT' });
            mockGetProgressLogs.mockResolvedValue([{ update_text: 'Log 1', delta_percentage: 10 }]);

            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith([{ update_text: 'Log 1', delta_percentage: 10 }]);
        });
    });
});
