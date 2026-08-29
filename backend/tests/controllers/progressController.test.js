const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockCheckProjectOwnership = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args)
}));

jest.mock('../../utils/auth', () => ({
    checkProjectOwnership: (...args) => mockCheckProjectOwnership(...args)
}));

const { logUpdate, getHistory } = require('../../controllers/progressController');

describe('Express progressController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { _id: 'user_1', email: 'user@test.com' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logUpdate', () => {
        it('should return 201 Created on valid progress update', async () => {
            req.body = {
                teamId: 'proj_123',
                updateText: 'Phase 1 complete',
                deltaPercentage: 20
            };
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockResolvedValue({ success: true });

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress update logged successfully',
                data: { success: true }
            });
        });

        it('should return 400 Bad Request if validation fails', async () => {
            req.body = {
                teamId: 'proj_123',
                updateText: 'Text',
                deltaPercentage: false
            };

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('booleans are not allowed')
            }));
        });

        it('should return 401 Unauthorized if req.user is missing', async () => {
            req.body = {
                teamId: 'proj_123',
                updateText: 'Phase 1 complete',
                deltaPercentage: 20
            };
            delete req.user;

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Unauthorized: Missing user authentication'
            });
        });

        it('should return 403 Forbidden if user does not own project', async () => {
            req.body = {
                teamId: 'proj_other',
                updateText: 'Valid text',
                deltaPercentage: 10
            };
            mockCheckProjectOwnership.mockResolvedValue(false);

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Forbidden: Access denied for project'
            });
        });

        it('should return 500 on internal service error', async () => {
            req.body = {
                teamId: 'proj_123',
                updateText: 'Valid text',
                deltaPercentage: 10
            };
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockRejectedValue(new Error('DynamoDB Error'));

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Internal Server Error'
            });
        });
    });

    describe('getHistory', () => {
        it('should return 200 OK with progress logs', async () => {
            req.params = { teamId: 'proj_123' };
            const logs = [{ PK: 'PROJ#proj_123', update_text: 'Log 1' }];
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockGetProgressLogs.mockResolvedValue(logs);

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(logs);
        });

        it('should return 401 Unauthorized if req.user is missing', async () => {
            req.params = { teamId: 'proj_123' };
            delete req.user;

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Unauthorized: Missing user authentication'
            });
        });

        it('should return 403 Forbidden if user is not authorized', async () => {
            req.params = { teamId: 'proj_other' };
            mockCheckProjectOwnership.mockResolvedValue(false);

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Forbidden: Access denied for project'
            });
        });

        it('should return 500 on error', async () => {
            req.params = { teamId: 'proj_123' };
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockGetProgressLogs.mockRejectedValue(new Error('Query error'));

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Internal Server Error'
            });
        });
    });
});
