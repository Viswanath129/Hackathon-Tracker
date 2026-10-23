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

const { logUpdate, getHistory } = require('../../controllers/progressController');

describe('Express Controller: progressController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { _id: 'user1', email: 'user@example.com' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logUpdate', () => {
        it('should return 400 for validation errors (e.g. missing teamId)', async () => {
            req.body = { updateText: 'Testing', deltaPercentage: 10 };
            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'teamId must be a non-empty string' });
        });

        it('should return 400 if deltaPercentage is a boolean', async () => {
            req.body = { teamId: 'proj1', updateText: 'Testing', deltaPercentage: false };
            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'deltaPercentage must be a number between -100 and 100' });
        });

        it('should return 404 if project is not found', async () => {
            req.body = { teamId: 'proj1', updateText: 'Testing', deltaPercentage: 10 };
            mockGetProjectById.mockResolvedValue(null);
            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        it('should return 403 for BOLA violation', async () => {
            req.body = { teamId: 'proj1', updateText: 'Testing', deltaPercentage: 10 };
            req.user = { _id: 'user2', email: 'other@example.com' };
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', email: 'owner@example.com', PK: 'USER#owner@example.com' });

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: Not authorized to update this project' });
        });

        it('should return 201 on success', async () => {
            req.body = { teamId: 'proj1', updateText: 'Testing', deltaPercentage: 10 };
            req.user = { _id: 'user1', email: 'owner@example.com' };
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', email: 'owner@example.com', PK: 'USER#owner@example.com' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-10-23T00:00:00.000Z' });

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress log created successfully',
                log: { success: true, timestamp: '2026-10-23T00:00:00.000Z' }
            });
        });

        it('should return 500 on internal exception', async () => {
            req.body = { teamId: 'proj1', updateText: 'Testing', deltaPercentage: 10 };
            mockGetProjectById.mockRejectedValue(new Error('DB failure'));

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        });
    });

    describe('getHistory', () => {
        it('should return 404 if project is missing', async () => {
            req.params.teamId = 'proj1';
            mockGetProjectById.mockResolvedValue(null);

            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Project not found' });
        });

        it('should return 200 with data on success', async () => {
            req.params.teamId = 'proj1';
            req.user = { _id: 'user1', email: 'owner@example.com' };
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', email: 'owner@example.com', PK: 'USER#owner@example.com' });
            mockGetProgressLogs.mockResolvedValue([{ update_text: 'Update 1' }]);

            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: [{ update_text: 'Update 1' }]
            });
        });
    });
});
