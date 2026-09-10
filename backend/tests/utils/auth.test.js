const mockDynamoService = {
    getProjectById: jest.fn()
};

jest.mock('../../services/dynamoService', () => mockDynamoService);

const { checkProjectOwnership } = require('../../utils/auth');

describe('checkProjectOwnership', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns false if user or projectId is missing', async () => {
        expect(await checkProjectOwnership(null, 'proj_123')).toBe(false);
        expect(await checkProjectOwnership({ _id: 'user_1' }, null)).toBe(false);
    });

    test('returns true for admin role without querying dynamo', async () => {
        const user = { role: 'admin', email: 'admin@example.com' };
        const result = await checkProjectOwnership(user, 'proj_123');
        expect(result).toBe(true);
        expect(mockDynamoService.getProjectById).not.toHaveBeenCalled();
    });

    test('returns false if project is not found', async () => {
        mockDynamoService.getProjectById.mockResolvedValue(null);
        const user = { _id: 'user_1', email: 'user@example.com', role: 'user' };
        const result = await checkProjectOwnership(user, 'proj_123');
        expect(result).toBe(false);
        expect(mockDynamoService.getProjectById).toHaveBeenCalledWith('proj_123');
    });

    test('returns true if team_id matches user _id', async () => {
        mockDynamoService.getProjectById.mockResolvedValue({
            _id: 'proj_123',
            team_id: 'user_1'
        });
        const user = { _id: 'user_1', email: 'user@example.com', role: 'user' };
        const result = await checkProjectOwnership(user, 'proj_123');
        expect(result).toBe(true);
    });

    test('returns true if userEmail matches user email', async () => {
        mockDynamoService.getProjectById.mockResolvedValue({
            _id: 'proj_123',
            userEmail: 'user@example.com'
        });
        const user = { _id: 'user_1', email: 'USER@example.com', role: 'user' };
        const result = await checkProjectOwnership(user, 'proj_123');
        expect(result).toBe(true);
    });

    test('returns false if user does not own project', async () => {
        mockDynamoService.getProjectById.mockResolvedValue({
            _id: 'proj_123',
            team_id: 'user_2',
            userEmail: 'other@example.com'
        });
        const user = { _id: 'user_1', email: 'user@example.com', role: 'user' };
        const result = await checkProjectOwnership(user, 'proj_123');
        expect(result).toBe(false);
    });
});
