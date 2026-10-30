const { logUpdate, getHistory } = require('../../controllers/progressController');
const dynamoService = require('../../services/dynamoService');
const { logProgress, getProgressLogs } = require('../../services/progressService');

jest.mock('../../services/dynamoService');
jest.mock('../../services/progressService');

describe('Express progressController', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            params: {},
            user: { _id: 'team123', email: 'team@example.com', role: 'team' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
    });

    describe('logUpdate', () => {
        it('should return 400 if validation fails', async () => {
            req.body = { teamId: 'proj123', updateText: '' }; // missing deltaPercentage & invalid updateText
            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
        });

        it('should return 400 if deltaPercentage is a boolean', async () => {
            req.body = { teamId: 'proj123', updateText: 'Valid update', deltaPercentage: true };
            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'deltaPercentage must be a number' });
        });

        it('should return 404 if project does not exist', async () => {
            req.body = { teamId: 'proj123', updateText: 'Progress updated', deltaPercentage: 10 };
            dynamoService.getProjectById.mockResolvedValue(null);

            await logUpdate(req, res);
            expect(dynamoService.getProjectById).toHaveBeenCalledWith('proj123');
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        it('should return 403 if project does not belong to user (BOLA check)', async () => {
            req.body = { teamId: 'proj123', updateText: 'Progress updated', deltaPercentage: 10 };
            dynamoService.getProjectById.mockResolvedValue({ _id: 'proj123', team_id: 'otherTeam', email: 'other@example.com' });

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: You do not own this project' });
        });

        it('should return 201 on successful progress update', async () => {
            req.body = { teamId: 'proj123', updateText: 'Progress updated', deltaPercentage: 10 };
            dynamoService.getProjectById.mockResolvedValue({ _id: 'proj123', team_id: 'team123', email: 'team@example.com' });
            logProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T12:00:00.000Z' });
            dynamoService.saveActivity.mockResolvedValue({});

            await logUpdate(req, res);
            expect(logProgress).toHaveBeenCalledWith('proj123', 'Progress updated', 10);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress update logged successfully',
                timestamp: '2026-02-28T12:00:00.000Z'
            });
        });
    });

    describe('getHistory', () => {
        it('should return 404 if project is not found', async () => {
            req.params = { teamId: 'proj123' };
            dynamoService.getProjectById.mockResolvedValue(null);

            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        it('should return 403 if user does not own project', async () => {
            req.params = { teamId: 'proj123' };
            dynamoService.getProjectById.mockResolvedValue({ _id: 'proj123', team_id: 'otherTeam' });

            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: You do not own this project' });
        });

        it('should return 200 and history logs when project is owned', async () => {
            req.params = { teamId: 'proj123' };
            dynamoService.getProjectById.mockResolvedValue({ _id: 'proj123', team_id: 'team123' });
            const logs = [{ PK: 'PROJ#proj123', SK: 'LOG#1', update_text: 'Done step 1', delta_percentage: 20 }];
            getProgressLogs.mockResolvedValue(logs);

            await getHistory(req, res);
            expect(getProgressLogs).toHaveBeenCalledWith('proj123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(logs);
        });
    });
});
