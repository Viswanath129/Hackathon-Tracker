const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockGetProjectById = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

jest.mock('../../services/dynamoService', () => ({
    getProjectById: mockGetProjectById,
    getUser: jest.fn()
}));

const { logProgressUpdate, getProgressHistory } = require('../../controllers/progressController');

describe('Progress Express Controller', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = { body: {}, params: {}, user: null };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('logProgressUpdate', () => {
        test('returns 400 when body is empty', async () => {
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Request body is required' });
        });

        test('returns 400 when deltaPercentage is invalid', async () => {
            req.body = { teamId: 'proj_123', updateText: 'Valid text', deltaPercentage: 'invalid_number' };
            await logProgressUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'deltaPercentage must be a valid number' });
        });

        test('returns 201 Created on valid input', async () => {
            req.body = { teamId: 'proj_123', updateText: 'Updated backend schema', deltaPercentage: 15 };
            mockLogProgress.mockResolvedValueOnce({ success: true });

            await logProgressUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress update logged successfully',
                data: { success: true }
            });
        });
    });

    describe('getProgressHistory', () => {
        test('returns 200 OK and array of logs', async () => {
            req.params.teamId = 'proj_123';
            const logs = [{ update_text: 'Initial log', delta_percentage: 10 }];
            mockGetProgressLogs.mockResolvedValueOnce(logs);

            await getProgressHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Progress history retrieved successfully',
                data: logs
            });
        });
    });
});
