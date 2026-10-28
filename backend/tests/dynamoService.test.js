const mockSend = jest.fn();

jest.mock('../config/dynamo', () => ({
    docClient: {
        send: mockSend
    },
    TABLE_NAME: 'TestTable'
}));

const dynamoService = require('../services/dynamoService');

describe('DynamoService Extension Tests', () => {
    beforeEach(() => {
        mockSend.mockReset();
    });

    test('getProjectById finds item in first scan page', async () => {
        mockSend.mockResolvedValueOnce({
            Items: [{ _id: 'proj_99', type: 'PROJECT', PK: 'HACK#1', SK: 'PROJ#proj_99' }]
        });

        const result = await dynamoService.getProjectById('proj_99');
        expect(result).toEqual({ _id: 'proj_99', type: 'PROJECT', PK: 'HACK#1', SK: 'PROJ#proj_99' });
        expect(mockSend).toHaveBeenCalledTimes(1);
    });

    test('getProjectById paginates via ExclusiveStartKey until found', async () => {
        mockSend
            .mockResolvedValueOnce({
                Items: [],
                LastEvaluatedKey: { PK: 'HACK#1', SK: 'PROJ#proj_0' }
            })
            .mockResolvedValueOnce({
                Items: [{ _id: 'proj_99', type: 'PROJECT', PK: 'HACK#2', SK: 'PROJ#proj_99' }]
            });

        const result = await dynamoService.getProjectById('proj_99');
        expect(result).toEqual({ _id: 'proj_99', type: 'PROJECT', PK: 'HACK#2', SK: 'PROJ#proj_99' });
        expect(mockSend).toHaveBeenCalledTimes(2);
    });

    test('getProjectById returns null if not found across pages', async () => {
        mockSend.mockResolvedValueOnce({
            Items: []
        });

        const result = await dynamoService.getProjectById('proj_missing');
        expect(result).toBeNull();
    });
});
