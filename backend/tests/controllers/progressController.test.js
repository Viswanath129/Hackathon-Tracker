const mockProgressService = {
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
};

const mockDynamoService = {
    getAllProjects: jest.fn()
};

jest.mock('../../services/progressService', () => mockProgressService);
jest.mock('../../services/dynamoService', () => mockDynamoService);

const { logProgressUpdate, getProgressHistory } = require('../../controllers/progressController');

describe('Progress Express Controllers', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            body: {},
            params: {},
            user: null
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('logProgressUpdate', () => {
        test('returns 400 when validation fails', async () => {
            mockReq.body = { teamId: 't1', updateText: '' };
            await logProgressUpdate(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        test('returns 403 when user is forbidden', async () => {
            mockReq.body = { teamId: 'proj1', updateText: 'Valid', deltaPercentage: 10 };
            mockReq.user = { _id: 'user1', role: 'user' };
            mockDynamoService.getAllProjects.mockResolvedValue([{ _id: 'proj1', team_id: 'user2' }]);

            await logProgressUpdate(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        test('returns 201 on success', async () => {
            mockReq.body = { teamId: 'proj1', updateText: 'Valid', deltaPercentage: 10 };
            mockReq.user = { _id: 'user1', role: 'user' };
            mockDynamoService.getAllProjects.mockResolvedValue([{ _id: 'proj1', team_id: 'user1' }]);
            mockProgressService.logProgress.mockResolvedValue({ success: true });

            await logProgressUpdate(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockProgressService.logProgress).toHaveBeenCalledWith('proj1', 'Valid', 10);
        });
    });

    describe('getProgressHistory', () => {
        test('returns 400 if teamId is missing', async () => {
            mockReq.params = {};
            await getProgressHistory(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        test('returns 200 with logs on success', async () => {
            mockReq.params = { teamId: 'proj1' };
            const mockLogs = [{ SK: 'LOG#1', update_text: 'Test log' }];
            mockProgressService.getProgressLogs.mockResolvedValue(mockLogs);

            await getProgressHistory(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(mockLogs);
        });
    });
});
