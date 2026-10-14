const mockGetProjectById = jest.fn();
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock('../../services/dynamoService', () => ({
    getProjectById: (...args) => mockGetProjectById(...args),
}));

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args),
}));

const { logProgressUpdate, getProgressHistory } = require('../../controllers/progressController');

describe('Express Controller - progressController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { email: 'user@example.com', teamId: 'proj1' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logProgressUpdate', () => {
        it('returns 400 when input validation fails', async () => {
            req.body = { teamId: 'proj1', updateText: 'Update', deltaPercentage: 'invalid' };
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 404 when project does not exist', async () => {
            req.body = { teamId: 'proj1', updateText: 'Update', deltaPercentage: 15 };
            mockGetProjectById.mockResolvedValue(null);

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        it('returns 403 when user is not authorized for project (BOLA check)', async () => {
            req.body = { teamId: 'proj1', updateText: 'Update', deltaPercentage: 15 };
            req.user = { email: 'other@example.com', teamId: 'other-team' };
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', teamEmail: 'owner@example.com', teamId: 'owner-team' });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: Access denied' });
        });

        it('returns 201 Created on successful progress update', async () => {
            req.body = { teamId: 'proj1', updateText: 'Update', deltaPercentage: 15 };
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', teamEmail: 'user@example.com' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });

            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Progress update logged successfully',
                success: true
            }));
        });
    });

    describe('getProgressHistory', () => {
        it('returns 400 when teamId param is missing', async () => {
            req.params = {};
            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 404 when project is not found', async () => {
            req.params = { teamId: 'proj1' };
            mockGetProjectById.mockResolvedValue(null);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('returns 403 when authorization check fails', async () => {
            req.params = { teamId: 'proj1' };
            req.user = { email: 'other@example.com', teamId: 'other-team' };
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', teamEmail: 'owner@example.com', teamId: 'owner-team' });

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('returns 200 OK with progress history logs on success', async () => {
            req.params = { teamId: 'proj1' };
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', teamEmail: 'user@example.com' });
            const logs = [{ update_text: 'Log 1', delta_percentage: 10 }];
            mockGetProgressLogs.mockResolvedValue(logs);

            await getProgressHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true, logs });
        });
    });
});
