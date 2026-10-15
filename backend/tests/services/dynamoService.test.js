const mockSend = jest.fn();

jest.mock('../../config/dynamo', () => ({
    docClient: {
        send: mockSend
    },
    TABLE_NAME: 'TestTable'
}));

const dynamoService = require('../../services/dynamoService');

describe('dynamoService.getProjectById', () => {
    beforeEach(() => {
        mockSend.mockReset();
    });

    it('should find project using ScanCommand with filter expression and reserved type mapping', async () => {
        const mockProject = {
            PK: 'HACK#hack1',
            SK: 'PROJ#proj100',
            type: 'PROJECT',
            title: 'Hackathon Project'
        };

        mockSend.mockResolvedValueOnce({
            Items: [mockProject]
        });

        const result = await dynamoService.getProjectById('proj100');

        expect(result).toEqual(mockProject);
        expect(mockSend).toHaveBeenCalledTimes(1);

        const commandArg = mockSend.mock.calls[0][0];
        expect(commandArg.input.TableName).toBe('TestTable');
        expect(commandArg.input.FilterExpression).toBe('SK = :sk AND #type = :type');
        expect(commandArg.input.ExpressionAttributeNames).toEqual({ '#type': 'type' });
        expect(commandArg.input.ExpressionAttributeValues).toEqual({
            ':sk': 'PROJ#proj100',
            ':type': 'PROJECT'
        });
    });

    it('should paginate with ExclusiveStartKey until project is found', async () => {
        const mockProject = {
            PK: 'HACK#hack1',
            SK: 'PROJ#proj200',
            type: 'PROJECT'
        };

        mockSend
            .mockResolvedValueOnce({
                Items: [],
                LastEvaluatedKey: { PK: 'HACK#1', SK: 'PROJ#1' }
            })
            .mockResolvedValueOnce({
                Items: [mockProject]
            });

        const result = await dynamoService.getProjectById('proj200');

        expect(result).toEqual(mockProject);
        expect(mockSend).toHaveBeenCalledTimes(2);
        expect(mockSend.mock.calls[1][0].input.ExclusiveStartKey).toEqual({ PK: 'HACK#1', SK: 'PROJ#1' });
    });

    it('should return null if project is not found after scanning all pages', async () => {
        mockSend.mockResolvedValueOnce({
            Items: []
        });

        const result = await dynamoService.getProjectById('nonexistent');
        expect(result).toBeNull();
    });
});
