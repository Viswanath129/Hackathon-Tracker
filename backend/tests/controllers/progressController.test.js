const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockGetProjectById = jest.fn();
const mockGetHackathon = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args)
}));

jest.mock('../../services/dynamoService', () => ({
    getProjectById: (...args) => mockGetProjectById(...args),
    getHackathon: (...args) => mockGetHackathon(...args)
}));

const { logProgressUpdate, getProgressHistory } = require('../../controllers/progressController');

describe('Express Progress Controller', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { email: 'user@example.com', role: 'user' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logProgressUpdate', () => {
        test('returns 400 on invalid input', async () => {
            req.body = { teamId: '', updateText: 'test', deltaPercentage: 10 };
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 403 on BOLA violation', async () => {
            req.body = { teamId: 'otherteam@example.com', updateText: 'Valid update', deltaPercentage: 15 };
            mockGetProjectById.mockResolvedValue(null);

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Forbidden') }));
        });

        test('returns 201 on success', async () => {
            req.body = { teamId: 'user@example.com', updateText: 'Valid update', deltaPercentage: 15 };
            mockLogProgress.mockResolvedValue({ success: true });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(mockLogProgress).toHaveBeenCalledWith('user@example.com', 'Valid update', 15);
        });
    });

    describe('getProgressHistory', () => {
        test('returns 400 when teamId param is missing', async () => {
            req.params = {};
            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 403 on BOLA violation', async () => {
            req.params = { teamId: 'unauthorized@example.com' };
            mockGetProjectById.mockResolvedValue(null);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('returns 200 with logs on success', async () => {
            req.params = { teamId: 'user@example.com' };
            const logs = [{ updateText: 'Log 1', deltaPercentage: 10 }];
            mockGetProgressLogs.mockResolvedValue(logs);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: logs }));
        });
    });
});
