const mockSend = jest.fn();

jest.mock('../../config/dynamo', () => ({
    docClient: {
        send: mockSend
    },
    TABLE_NAME: 'HackathonTracker'
}));

const dynamoService = require('../../services/dynamoService');

describe('dynamoService.getProjectById', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should query DynamoDB using ScanCommand with FilterExpression and ExpressionAttributeNames', async () => {
        const mockProject = {
            PK: 'HACK#hack123',
            SK: 'PROJ#proj456',
            _id: 'proj456',
            type: 'PROJECT',
            project_title: 'Test Project'
        };

        mockSend.mockResolvedValueOnce({ Items: [mockProject] });

        const project = await dynamoService.getProjectById('proj456');

        expect(mockSend).toHaveBeenCalledTimes(1);
        const commandArg = mockSend.mock.calls[0][0];
        expect(commandArg.input.TableName).toBe('HackathonTracker');
        expect(commandArg.input.FilterExpression).toBe('SK = :sk AND #type = :type');
        expect(commandArg.input.ExpressionAttributeNames).toEqual({ '#type': 'type' });
        expect(commandArg.input.ExpressionAttributeValues).toEqual({
            ':sk': 'PROJ#proj456',
            ':type': 'PROJECT'
        });
        expect(project).toEqual(mockProject);
    });

    test('should return null if no project matches', async () => {
        mockSend.mockResolvedValueOnce({ Items: [] });

        const project = await dynamoService.getProjectById('nonexistent');
        expect(project).toBeNull();
    });
});
