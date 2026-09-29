const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockGetProjectById = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

jest.mock('../../services/dynamoService', () => ({
    getProjectById: mockGetProjectById
}));

const { logUpdate, getHistory } = require('../../controllers/progressController');

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('Express Progress Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate', () => {
        test('returns 400 when validation fails', async () => {
            const req = { body: { teamId: '', updateText: 'text', deltaPercentage: 10 }, user: { _id: 'u1' } };
            const res = mockResponse();

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('returns 404 when project does not exist', async () => {
            mockGetProjectById.mockResolvedValue(null);
            const req = { body: { teamId: 'proj1', updateText: 'text', deltaPercentage: 10 }, user: { _id: 'u1' } };
            const res = mockResponse();

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('returns 403 when user is not authorized', async () => {
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', teamId: 'proj1' });
            const req = { body: { teamId: 'proj1', updateText: 'text', deltaPercentage: 10 }, user: { _id: 'u2', teamId: 'proj2', role: 'user' } };
            const res = mockResponse();

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('returns 201 on success', async () => {
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', teamId: 'proj1' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });
            const req = { body: { teamId: 'proj1', updateText: 'text', deltaPercentage: 10 }, user: { _id: 'u1', teamId: 'proj1', role: 'user' } };
            const res = mockResponse();

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Progress update logged successfully' }));
        });
    });

    describe('getHistory', () => {
        test('returns 404 when project does not exist', async () => {
            mockGetProjectById.mockResolvedValue(null);
            const req = { params: { teamId: 'proj1' }, user: { _id: 'u1' } };
            const res = mockResponse();

            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('returns 200 with logs on success', async () => {
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', teamId: 'proj1' });
            const logs = [{ update_text: 'Done', delta_percentage: 10 }];
            mockGetProgressLogs.mockResolvedValue(logs);
            const req = { params: { teamId: 'proj1' }, user: { _id: 'u1', teamId: 'proj1', role: 'user' } };
            const res = mockResponse();

            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: logs }));
        });
    });
});
