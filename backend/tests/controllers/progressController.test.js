const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockGetProjectById = jest.fn();
const mockGetUser = jest.fn();
const mockGetHackathon = jest.fn();
const mockGetHackathonsByUser = jest.fn();
const mockGetProject = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args)
}));

jest.mock('../../services/dynamoService', () => ({
    getProjectById: (...args) => mockGetProjectById(...args),
    getUser: (...args) => mockGetUser(...args),
    getHackathon: (...args) => mockGetHackathon(...args),
    getHackathonsByUser: (...args) => mockGetHackathonsByUser(...args),
    getProject: (...args) => mockGetProject(...args)
}));

const { logUpdate, getHistory } = require('../../controllers/progressController');

describe('progressController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { _id: 'user1', email: 'user@example.com', role: 'user' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logUpdate', () => {
        test('returns 400 when input validation fails', async () => {
            req.body = { teamId: '', updateText: 'test', deltaPercentage: 10 };
            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
        });

        test('returns 403 when user is not authorized for teamId', async () => {
            req.body = { teamId: 'proj999', updateText: 'Update', deltaPercentage: 10 };
            mockGetProjectById.mockResolvedValue(null);
            mockGetHackathonsByUser.mockResolvedValue([]);

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: Access denied to this project' });
        });

        test('returns 201 when user is authorized and progress logged successfully', async () => {
            req.body = { teamId: 'proj1', updateText: 'Update feature', deltaPercentage: 20 };
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', team_id: 'user1', type: 'PROJECT' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });

            await logUpdate(req, res);
            expect(mockLogProgress).toHaveBeenCalledWith('proj1', 'Update feature', 20);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });
        });

        test('allows admin role to log update for any project', async () => {
            req.user = { _id: 'admin1', role: 'admin', email: 'admin@example.com' };
            req.body = { teamId: 'proj999', updateText: 'Admin Update', deltaPercentage: 50 };
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
        });

        test('returns 500 when logProgress throws error', async () => {
            req.body = { teamId: 'user1', updateText: 'Update', deltaPercentage: 10 };
            mockLogProgress.mockRejectedValue(new Error('DynamoDB Error'));

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });

    describe('getHistory', () => {
        test('returns 400 when teamId param is missing', async () => {
            req.params = { teamId: '   ' };
            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 403 when user is not authorized', async () => {
            req.params = { teamId: 'proj999' };
            mockGetProjectById.mockResolvedValue(null);
            mockGetHackathonsByUser.mockResolvedValue([]);

            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('returns 200 with logs when authorized', async () => {
            req.params = { teamId: 'proj1' };
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', team_id: 'user1', type: 'PROJECT' });
            const mockLogs = [{ SK: 'LOG#123', update_text: 'Log 1', delta_percentage: 10 }];
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockLogs);
        });
    });
});
