const mockDocClient = {
    send: jest.fn()
};

jest.mock('../config/dynamo', () => ({
    docClient: mockDocClient,
    TABLE_NAME: 'HackathonTracker'
}));

const { logProgress, getProgressLogs } = require('../services/progressService');

describe('progressService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('logProgress sends PutCommand and returns success', async () => {
        mockDocClient.send.mockResolvedValueOnce({});

        const result = await logProgress('proj_100', 'Sprint 1 complete', 20);

        expect(result.success).toBe(true);
        expect(result.timestamp).toBeDefined();
        expect(mockDocClient.send).toHaveBeenCalledTimes(1);
    });

    test('getProgressLogs queries DynamoDB and returns items', async () => {
        const mockItems = [
            { PK: 'PROJ#proj_100', SK: 'LOG#2026-01-01T00:00:00.000Z', update_text: 'Test', delta_percentage: 10 }
        ];
        mockDocClient.send.mockResolvedValueOnce({ Items: mockItems });

        const logs = await getProgressLogs('proj_100');

        expect(logs).toEqual(mockItems);
        expect(mockDocClient.send).toHaveBeenCalledTimes(1);
    });
});
