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

const { logProgressUpdate, getProgressHistory } = require('../../controllers/progressController');

describe('Express Progress Controller', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { _id: 't1' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logProgressUpdate', () => {
        test('returns 400 when input validation fails', async () => {
            req.body = { teamId: '', updateText: '', deltaPercentage: 10 };
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 404 when project is not found', async () => {
            req.body = { teamId: 'p1', updateText: 'Testing', deltaPercentage: 10 };
            mockGetProjectById.mockResolvedValue(null);

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        test('returns 403 when authorization check fails', async () => {
            req.body = { teamId: 'p1', updateText: 'Testing', deltaPercentage: 10 };
            req.user = { _id: 't1' };
            mockGetProjectById.mockResolvedValue({ _id: 'p1', team_id: 't2' });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Access denied: Project ownership check failed' });
        });

        test('returns 201 Created on success', async () => {
            req.body = { teamId: 'p1', updateText: 'Testing success', deltaPercentage: 20 };
            req.user = { _id: 't1' };
            mockGetProjectById.mockResolvedValue({ _id: 'p1', team_id: 't1' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01' });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress logged successfully',
                result: { success: true, timestamp: '2026-03-01' }
            });
        });
    });

    describe('getProgressHistory', () => {
        test('returns 200 OK with history logs', async () => {
            req.params = { teamId: 'p1' };
            req.user = { _id: 't1' };
            const mockLogs = [{ SK: 'LOG#123', update_text: 'Done', delta_percentage: 10 }];
            mockGetProjectById.mockResolvedValue({ _id: 'p1', team_id: 't1' });
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockLogs);
        });
    });
});
