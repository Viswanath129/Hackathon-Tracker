const { logUpdate, getHistory } = require('../../controllers/progressController');

jest.mock('../../services/progressService', () => ({
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
}));

jest.mock('../../services/dynamoService', () => ({
    getAllProjects: jest.fn().mockResolvedValue([])
}));

const { logProgress, getProgressLogs } = require('../../services/progressService');

describe('Express Progress Controller', () => {
    let req, res;

    beforeEach(() => {
        req = { body: {}, params: {}, user: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    describe('logUpdate', () => {
        test('returns 400 Bad Request on validation failure', async () => {
            req.body = { teamId: '', updateText: 'Text', deltaPercentage: 10 };
            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
        });

        test('returns 403 Forbidden on authorization failure', async () => {
            req.body = { teamId: 'proj_1', updateText: 'Text', deltaPercentage: 10 };
            req.user = { role: 'user', email: 'user@test.com', _id: 'proj_other' };
            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('returns 201 Created on success', async () => {
            req.body = { teamId: 'proj_1', updateText: 'Update done', deltaPercentage: 20 };
            req.user = { role: 'admin', email: 'admin@test.com' };
            logProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress update logged successfully.',
                timestamp: '2026-03-01T00:00:00.000Z'
            });
        });
    });

    describe('getHistory', () => {
        test('returns 400 if teamId param is missing', async () => {
            req.params = { teamId: '' };
            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 200 OK with history logs for authorized user', async () => {
            req.params = { teamId: 'proj_1' };
            req.user = { role: 'user', email: 'user@test.com', _id: 'proj_1' };
            const mockLogs = [{ SK: 'LOG#1', update_text: 'Text' }];
            getProgressLogs.mockResolvedValue(mockLogs);

            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                teamId: 'proj_1',
                logs: mockLogs
            });
        });
    });
});
