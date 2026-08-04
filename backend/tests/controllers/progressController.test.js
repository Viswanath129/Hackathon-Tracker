// Mocking services before requiring controller with correct variable prefixes
const mockDynamoService = {
    getAllProjects: jest.fn()
};
const mockProgressService = {
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
};

jest.mock('../../services/dynamoService', () => mockDynamoService);
jest.mock('../../services/progressService', () => mockProgressService);

const { logUpdate, getHistory } = require('../../controllers/progressController');

describe('progressController Express Controller', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: {
                _id: 'user_team_123',
                email: 'team@gmail.com',
                role: 'user'
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('logUpdate', () => {
        test('should return 400 when validation fails (e.g. missing teamId)', async () => {
            req.body = {
                updateText: 'Did some work',
                deltaPercentage: 10
            };

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.any(String)
            }));
        });

        test('should return 404 if project is not found', async () => {
            req.body = {
                teamId: 'proj_not_found',
                updateText: 'Did some work',
                deltaPercentage: 10
            };
            mockDynamoService.getAllProjects.mockResolvedValue([]);

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        test('should return 403 (Forbidden) if user is not admin and does not own the project', async () => {
            req.body = {
                teamId: 'proj_other_team',
                updateText: 'Did some work',
                deltaPercentage: 10
            };
            mockDynamoService.getAllProjects.mockResolvedValue([
                { _id: 'proj_other_team', team_id: 'another_user_id', type: 'PROJECT' }
            ]);

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: You do not own this project' });
        });

        test('should succeed (201 Created) if user is the project owner', async () => {
            req.body = {
                teamId: 'proj_my_team',
                updateText: 'Deploying backend updates',
                deltaPercentage: 15
            };
            mockDynamoService.getAllProjects.mockResolvedValue([
                { _id: 'proj_my_team', team_id: 'user_team_123', type: 'PROJECT' }
            ]);
            mockProgressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-08-04T12:00:00.000Z' });

            await logUpdate(req, res);

            expect(mockProgressService.logProgress).toHaveBeenCalledWith('proj_my_team', 'Deploying backend updates', 15);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ success: true, timestamp: '2026-08-04T12:00:00.000Z' });
        });

        test('should succeed (201 Created) if user is an admin even if they do not own the project', async () => {
            req.user.role = 'admin';
            req.user._id = 'admin_id';
            req.body = {
                teamId: 'proj_any_team',
                updateText: 'Admin log update',
                deltaPercentage: 5
            };
            mockDynamoService.getAllProjects.mockResolvedValue([
                { _id: 'proj_any_team', team_id: 'another_user_id', type: 'PROJECT' }
            ]);
            mockProgressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-08-04T12:00:00.000Z' });

            await logUpdate(req, res);

            expect(mockProgressService.logProgress).toHaveBeenCalledWith('proj_any_team', 'Admin log update', 5);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ success: true, timestamp: '2026-08-04T12:00:00.000Z' });
        });

        test('should return 500 when error is thrown', async () => {
            req.body = {
                teamId: 'proj_my_team',
                updateText: 'Deploying backend updates',
                deltaPercentage: 15
            };
            mockDynamoService.getAllProjects.mockRejectedValue(new Error('DynamoDB Error'));

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });

    describe('getHistory', () => {
        test('should return 400 if teamId is empty or missing in request params', async () => {
            req.params = { teamId: ' ' };

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'teamId parameter is required' });
        });

        test('should return 404 if project is not found', async () => {
            req.params = { teamId: 'proj_not_found' };
            mockDynamoService.getAllProjects.mockResolvedValue([]);

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        test('should return 403 (Forbidden) if user is not admin and does not own the project', async () => {
            req.params = { teamId: 'proj_other_team' };
            mockDynamoService.getAllProjects.mockResolvedValue([
                { _id: 'proj_other_team', team_id: 'another_user_id', type: 'PROJECT' }
            ]);

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: You do not own this project' });
        });

        test('should return 200 with logs if user is the project owner', async () => {
            req.params = { teamId: 'proj_my_team' };
            mockDynamoService.getAllProjects.mockResolvedValue([
                { _id: 'proj_my_team', team_id: 'user_team_123', type: 'PROJECT' }
            ]);
            const mockLogs = [
                { PK: 'PROJ#proj_my_team', SK: 'LOG#1', update_text: 'Log 1', delta_percentage: 10 }
            ];
            mockProgressService.getProgressLogs.mockResolvedValue(mockLogs);

            await getHistory(req, res);

            expect(mockProgressService.getProgressLogs).toHaveBeenCalledWith('proj_my_team');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockLogs);
        });

        test('should return 200 with logs if user is admin', async () => {
            req.user.role = 'admin';
            req.params = { teamId: 'proj_any_team' };
            mockDynamoService.getAllProjects.mockResolvedValue([
                { _id: 'proj_any_team', team_id: 'another_user_id', type: 'PROJECT' }
            ]);
            const mockLogs = [
                { PK: 'PROJ#proj_any_team', SK: 'LOG#1', update_text: 'Log 1', delta_percentage: 10 }
            ];
            mockProgressService.getProgressLogs.mockResolvedValue(mockLogs);

            await getHistory(req, res);

            expect(mockProgressService.getProgressLogs).toHaveBeenCalledWith('proj_any_team');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockLogs);
        });

        test('should return 500 when error is thrown', async () => {
            req.params = { teamId: 'proj_my_team' };
            mockDynamoService.getAllProjects.mockRejectedValue(new Error('Internal Database Error'));

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });
});
