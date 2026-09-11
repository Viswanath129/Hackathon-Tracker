const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args)
}));

const { logUpdate, getHistory } = require('../../controllers/progressController');

describe('Express progressController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockResponse = () => {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        return res;
    };

    describe('logUpdate', () => {
        test('returns 201 Created on valid request and authorized user', async () => {
            mockLogProgress.mockResolvedValueOnce({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });

            const req = {
                user: { _id: 'team_1', role: 'team' },
                body: {
                    teamId: 'team_1',
                    updateText: 'Backend routes completed',
                    deltaPercentage: 25
                }
            };
            const res = mockResponse();

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Progress update logged successfully',
                success: true
            }));
            expect(mockLogProgress).toHaveBeenCalledWith('team_1', 'Backend routes completed', 25);
        });

        test('returns 400 Bad Request on invalid input', async () => {
            const req = {
                user: { _id: 'team_1', role: 'team' },
                body: {
                    teamId: 'team_1',
                    updateText: '',
                    deltaPercentage: 25
                }
            };
            const res = mockResponse();

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.any(String)
            }));
        });

        test('returns 403 Forbidden when ownership check fails', async () => {
            const req = {
                user: { _id: 'other_team', role: 'team' },
                body: {
                    teamId: 'team_1',
                    updateText: 'Backend routes completed',
                    deltaPercentage: 25
                }
            };
            const res = mockResponse();

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringMatching(/forbidden/i)
            }));
        });
    });

    describe('getHistory', () => {
        test('returns 200 OK with logs for authorized user', async () => {
            const logs = [{ PK: 'PROJ#team_1', update_text: 'Log 1' }];
            mockGetProgressLogs.mockResolvedValueOnce(logs);

            const req = {
                user: { _id: 'team_1', role: 'team' },
                params: { teamId: 'team_1' }
            };
            const res = mockResponse();

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(logs);
            expect(mockGetProgressLogs).toHaveBeenCalledWith('team_1');
        });

        test('returns 403 Forbidden for unauthorized user', async () => {
            const req = {
                user: { _id: 'unauthorized_team', role: 'team' },
                params: { teamId: 'team_1' }
            };
            const res = mockResponse();

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
        });
    });
});
