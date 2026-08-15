const mockSend = jest.fn();

jest.mock('@aws-sdk/lib-dynamodb', () => {
    const originalModule = jest.requireActual('@aws-sdk/lib-dynamodb');
    return {
        ...originalModule,
        ScanCommand: jest.fn().mockImplementation((input) => ({ input, commandType: 'ScanCommand' }))
    };
});

jest.mock('../../config/dynamo', () => ({
    docClient: {
        send: (...args) => mockSend(...args)
    },
    TABLE_NAME: 'TestTrackerTable'
}));

const dynamoService = require('../../services/dynamoService');
const { ScanCommand } = require('@aws-sdk/lib-dynamodb');

describe('dynamoService.getProjectById', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should query DynamoDB using ScanCommand with #type ExpressionAttributeNames', async () => {
        const mockProjectItem = {
            PK: 'HACK#hack_1',
            SK: 'PROJ#proj_777',
            _id: 'proj_777',
            type: 'PROJECT',
            project_title: 'Smart AI Assistant'
        };

        mockSend.mockResolvedValue({ Items: [mockProjectItem] });

        const result = await dynamoService.getProjectById('proj_777');

        expect(ScanCommand).toHaveBeenCalledWith(expect.objectContaining({
            TableName: 'TestTrackerTable',
            FilterExpression: 'SK = :sk AND #type = :type',
            ExpressionAttributeNames: {
                '#type': 'type'
            },
            ExpressionAttributeValues: {
                ':sk': 'PROJ#proj_777',
                ':type': 'PROJECT'
            }
        }));

        expect(result).toEqual(mockProjectItem);
    });

    test('should return null if no project item matches in Scan', async () => {
        mockSend.mockResolvedValue({ Items: [] });

        const result = await dynamoService.getProjectById('non_existent');
        expect(result).toBeNull();
    });
});
