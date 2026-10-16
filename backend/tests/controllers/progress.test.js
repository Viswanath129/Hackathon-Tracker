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

describe('Express progressController', () => {
    let req, res;

    beforeEach(() => {
        jest.resetAllMocks();
        req = {
            body: {},
            params: {},
            user: { teamId: 'team_alpha', email: 'alpha@example.com' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logUpdate', () => {
        test('returns 400 Bad Request on invalid input', async () => {
            req.body = { teamId: 'team_alpha', updateText: 'test', deltaPercentage: true };
            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 404 Not Found if project does not exist', async () => {
            req.body = { teamId: 'team_alpha', updateText: 'test', deltaPercentage: 10 };
            mockGetProjectById.mockResolvedValue(null);

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        test('returns 403 Forbidden on BOLA ownership mismatch', async () => {
            req.body = { teamId: 'team_beta', updateText: 'test', deltaPercentage: 10 };
            mockGetProjectById.mockResolvedValue({ teamId: 'team_beta', email: 'beta@example.com' });

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: Access denied' });
        });

        test('returns 201 Created on successful log update', async () => {
            req.body = { teamId: 'team_alpha', updateText: 'Finished sprint', deltaPercentage: 25 };
            mockGetProjectById.mockResolvedValue({ teamId: 'team_alpha', email: 'alpha@example.com' });
            mockLogProgress.mockResolvedValue({ success: true });

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress updated successfully',
                data: { success: true }
            });
        });

        test('returns 500 Internal Server Error on exception', async () => {
            req.body = { teamId: 'team_alpha', updateText: 'Finished sprint', deltaPercentage: 25 };
            mockGetProjectById.mockRejectedValue(new Error('Database crash'));

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });

    describe('getHistory', () => {
        test('returns 400 Bad Request if teamId param is missing', async () => {
            req.params = { teamId: '  ' };
            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 404 Not Found if project does not exist', async () => {
            req.params = { teamId: 'team_alpha' };
            mockGetProjectById.mockResolvedValue(null);

            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('returns 403 Forbidden on BOLA ownership mismatch', async () => {
            req.params = { teamId: 'team_beta' };
            mockGetProjectById.mockResolvedValue({ teamId: 'team_beta' });

            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('returns 200 OK with progress history logs on success', async () => {
            req.params = { teamId: 'team_alpha' };
            mockGetProjectById.mockResolvedValue({ teamId: 'team_alpha' });
            mockGetProgressLogs.mockResolvedValue([{ update_text: 'Log 1', delta_percentage: 10 }]);

            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                progress: [{ update_text: 'Log 1', delta_percentage: 10 }]
            });
        });
    });
});
