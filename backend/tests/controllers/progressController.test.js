const dynamoService = require('../../services/dynamoService');
const progressService = require('../../services/progressService');
const { logProgressUpdate, getProgressHistory } = require('../../controllers/progressController');

jest.mock('../../services/dynamoService');
jest.mock('../../services/progressService');

describe('Express progressController - logProgressUpdate', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            user: { _id: 'user1', email: 'user@example.com', role: 'team' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    test('returns 400 Bad Request on invalid input', async () => {
        req.body = { teamId: 'proj1', updateText: '' };
        await logProgressUpdate(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 404 Not Found when project does not exist', async () => {
        req.body = { teamId: 'proj1', updateText: 'Valid log', deltaPercentage: 15 };
        dynamoService.getProjectById.mockResolvedValue(null);

        await logProgressUpdate(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
    });

    test('returns 404 Not Found on BOLA authorization mismatch', async () => {
        req.body = { teamId: 'proj1', updateText: 'Valid log', deltaPercentage: 15 };
        dynamoService.getProjectById.mockResolvedValue({ _id: 'proj1', team_id: 'other_user' });

        await logProgressUpdate(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns 201 Created on successful progress update', async () => {
        req.body = { teamId: 'proj1', updateText: 'Valid log', deltaPercentage: 15 };
        dynamoService.getProjectById.mockResolvedValue({ _id: 'proj1', team_id: 'user1' });
        progressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });

        await logProgressUpdate(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Progress update logged successfully',
            timestamp: '2026-03-01T00:00:00.000Z',
            data: req.body
        });
    });

    test('returns 500 on internal service error', async () => {
        req.body = { teamId: 'proj1', updateText: 'Valid log', deltaPercentage: 15 };
        dynamoService.getProjectById.mockRejectedValue(new Error('Database offline'));

        await logProgressUpdate(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
    });
});

describe('Express progressController - getProgressHistory', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            params: { teamId: 'proj1' },
            user: { _id: 'user1', email: 'user@example.com', role: 'team' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    test('returns 200 OK with logs list for valid request', async () => {
        dynamoService.getProjectById.mockResolvedValue({ _id: 'proj1', team_id: 'user1' });
        const logs = [{ update_text: 'Update 1' }];
        progressService.getProgressLogs.mockResolvedValue(logs);

        await getProgressHistory(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(logs);
    });
});
