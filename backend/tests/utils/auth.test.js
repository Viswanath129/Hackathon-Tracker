const mockDynamoService = {
    getUser: jest.fn(),
    getProjectById: jest.fn()
};

jest.mock('../../services/dynamoService', () => mockDynamoService);

const { checkProjectOwnership } = require('../../utils/auth');

describe('checkProjectOwnership', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns false if user or teamId is missing', async () => {
        expect(await checkProjectOwnership(null, 'proj_1')).toBe(false);
        expect(await checkProjectOwnership({ role: 'team' }, null)).toBe(false);
    });

    test('returns true for admin users without fetching project', async () => {
        const adminUser = { _id: 'admin_1', role: 'admin', email: 'admin@example.com' };
        const result = await checkProjectOwnership(adminUser, 'proj_1');
        expect(result).toBe(true);
        expect(mockDynamoService.getProjectById).not.toHaveBeenCalled();
    });

    test('returns true for project owner matching user _id', async () => {
        const teamUser = { _id: 'team_1', role: 'team', email: 'team@example.com' };
        mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj_1', team_id: 'team_1' });

        const result = await checkProjectOwnership(teamUser, 'proj_1');
        expect(result).toBe(true);
        expect(mockDynamoService.getProjectById).toHaveBeenCalledWith('proj_1');
    });

    test('returns true when user email is passed and project belongs to user', async () => {
        mockDynamoService.getUser.mockResolvedValue({ _id: 'team_1', role: 'team', email: 'team@example.com' });
        mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj_1', team_id: 'team_1' });

        const result = await checkProjectOwnership('team@example.com', 'proj_1');
        expect(result).toBe(true);
    });

    test('returns false if project is not found', async () => {
        const teamUser = { _id: 'team_1', role: 'team', email: 'team@example.com' };
        mockDynamoService.getProjectById.mockResolvedValue(null);

        const result = await checkProjectOwnership(teamUser, 'non_existent');
        expect(result).toBe(false);
    });

    test('returns false if project is owned by another team', async () => {
        const teamUser = { _id: 'team_1', role: 'team', email: 'team1@example.com' };
        mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj_1', team_id: 'team_2', PK: 'USER#team2@example.com' });

        const result = await checkProjectOwnership(teamUser, 'proj_1');
        expect(result).toBe(false);
    });
});
