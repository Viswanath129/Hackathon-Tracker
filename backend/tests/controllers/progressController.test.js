const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockGetProjectById = jest.fn();
const mockGetHackathonsByUser = jest.fn();
const mockGetProjectsByHackathon = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args)
}));

jest.mock('../../services/dynamoService', () => ({
    getProjectById: (...args) => mockGetProjectById(...args),
    getHackathonsByUser: (...args) => mockGetHackathonsByUser(...args),
    getProjectsByHackathon: (...args) => mockGetProjectsByHackathon(...args)
}));

const { logUpdateController, getHistoryController } = require('../../controllers/progressController');

describe('Express Progress Controller', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { _id: 'user_1', email: 'test@example.com', role: 'user' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logUpdateController', () => {
        test('should return 400 when body is missing or empty', async () => {
            req.body = {};
            await logUpdateController(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Missing request body' });
        });

        test('should return 400 when validation fails', async () => {
            req.body = { teamId: 'p1', updateText: 'Text', deltaPercentage: true };
            await logUpdateController(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'deltaPercentage cannot be a boolean' });
        });

        test('should return 403 when user is not authorized for specified project (BOLA)', async () => {
            req.body = { teamId: 'proj_other', updateText: 'Update text', deltaPercentage: 20 };
            mockGetProjectById.mockResolvedValue({ _id: 'proj_other', team_id: 'user_other' });
            mockGetHackathonsByUser.mockResolvedValue([]);

            await logUpdateController(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: Access to specified team resource denied' });
        });

        test('should return 201 Created on successful progress update log', async () => {
            req.body = { teamId: 'proj_my', updateText: 'Update text', deltaPercentage: 15 };
            req.user = { _id: 'user_my', email: 'my@example.com', role: 'user' };
            mockGetProjectById.mockResolvedValue({ _id: 'proj_my', team_id: 'user_my' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T15:00:00.000Z' });

            await logUpdateController(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress updated successfully',
                timestamp: '2026-03-01T15:00:00.000Z'
            });
            expect(mockLogProgress).toHaveBeenCalledWith('proj_my', 'Update text', 15);
        });

        test('should return 500 Internal Server Error when service throws an exception', async () => {
            req.body = { teamId: 'proj_my', updateText: 'Update text', deltaPercentage: 15 };
            req.user = { _id: 'user_my', email: 'my@example.com', role: 'admin' };
            mockLogProgress.mockRejectedValue(new Error('DynamoDB Error'));

            await logUpdateController(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });

    describe('getHistoryController', () => {
        test('should return 200 OK with progress history logs', async () => {
            req.params = { teamId: 'proj_my' };
            req.user = { _id: 'user_my', email: 'my@example.com', role: 'user' };
            mockGetProjectById.mockResolvedValue({ _id: 'proj_my', team_id: 'user_my' });
            const mockLogs = [{ SK: 'LOG#1', update_text: 'Log 1' }];
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            await getHistoryController(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockLogs);
        });

        test('should return 403 Forbidden when BOLA check fails', async () => {
            req.params = { teamId: 'proj_secret' };
            req.user = { _id: 'user_other', email: 'other@example.com', role: 'user' };
            mockGetProjectById.mockResolvedValue({ _id: 'proj_secret', team_id: 'user_secret' });
            mockGetHackathonsByUser.mockResolvedValue([]);

            await getHistoryController(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: Access to specified team resource denied' });
        });

        test('should return 500 Internal Server Error when service fails', async () => {
            req.params = { teamId: 'proj_my' };
            req.user = { _id: 'user_my', email: 'my@example.com', role: 'admin' };
            mockGetProgressLogs.mockRejectedValue(new Error('Scan failed'));

            await getHistoryController(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });
});
