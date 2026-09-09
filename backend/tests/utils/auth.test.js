const mockGetProjectById = jest.fn();

jest.mock('../../services/dynamoService', () => ({
    getProjectById: (...args) => mockGetProjectById(...args)
}));

const { checkProjectOwnership } = require('../../utils/auth');

describe('checkProjectOwnership', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns false when user is null or undefined', async () => {
        const result = await checkProjectOwnership(null, 'proj_123');
        expect(result).toBe(false);
    });

    test('returns true for admin user regardless of project', async () => {
        const adminUser = { _id: 'admin_1', role: 'admin' };
        const result = await checkProjectOwnership(adminUser, 'proj_123');
        expect(result).toBe(true);
    });

    test('returns true when user owns the project via team_id', async () => {
        const user = { _id: 'user_1', email: 'user@test.com', role: 'team' };
        mockGetProjectById.mockResolvedValue({ _id: 'proj_123', team_id: 'user_1' });

        const result = await checkProjectOwnership(user, 'proj_123');
        expect(result).toBe(true);
        expect(mockGetProjectById).toHaveBeenCalledWith('proj_123');
    });

    test('returns false when user does not own the project', async () => {
        const user = { _id: 'user_1', email: 'user@test.com', role: 'team' };
        mockGetProjectById.mockResolvedValue({ _id: 'proj_123', team_id: 'other_user' });

        const result = await checkProjectOwnership(user, 'proj_123');
        expect(result).toBe(false);
    });

    test('returns true if project is not found but projectId equals user._id', async () => {
        const user = { _id: 'user_123', email: 'user@test.com', role: 'team' };
        mockGetProjectById.mockResolvedValue(null);

        const result = await checkProjectOwnership(user, 'user_123');
        expect(result).toBe(true);
    });
});
