const mockDynamoService = {
    getProjectById: jest.fn()
};

jest.mock('../services/dynamoService', () => mockDynamoService);

const { checkProjectOwnership } = require('../utils/auth');

describe('checkProjectOwnership', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 401 if user is not provided', async () => {
        const result = await checkProjectOwnership(null, 'proj_1');
        expect(result).toEqual({
            authorized: false,
            project: null,
            statusCode: 401,
            message: 'User authentication required'
        });
    });

    it('returns 404 if project is not found', async () => {
        mockDynamoService.getProjectById.mockResolvedValue(null);

        const result = await checkProjectOwnership({ _id: 'user_1', role: 'user' }, 'proj_1');
        expect(result).toEqual({
            authorized: false,
            project: null,
            statusCode: 404,
            message: 'Project not found'
        });
    });

    it('allows access for admin role regardless of project team_id', async () => {
        const mockProject = { _id: 'proj_1', team_id: 'user_other', hackathon_id: 'hack_1' };
        mockDynamoService.getProjectById.mockResolvedValue(mockProject);

        const result = await checkProjectOwnership({ _id: 'admin_user', role: 'admin' }, 'proj_1');
        expect(result).toEqual({
            authorized: true,
            project: mockProject
        });
    });

    it('denies access (403 BOLA) if user_id does not match project team_id', async () => {
        const mockProject = { _id: 'proj_1', team_id: 'user_owner', hackathon_id: 'hack_1' };
        mockDynamoService.getProjectById.mockResolvedValue(mockProject);

        const result = await checkProjectOwnership({ _id: 'user_attacker', role: 'user' }, 'proj_1');
        expect(result).toEqual({
            authorized: false,
            project: mockProject,
            statusCode: 403,
            message: 'Forbidden: You do not have permission to access this project'
        });
    });

    it('allows access if user_id matches project team_id', async () => {
        const mockProject = { _id: 'proj_1', team_id: 'user_owner', hackathon_id: 'hack_1' };
        mockDynamoService.getProjectById.mockResolvedValue(mockProject);

        const result = await checkProjectOwnership({ _id: 'user_owner', role: 'user' }, 'proj_1');
        expect(result).toEqual({
            authorized: true,
            project: mockProject
        });
    });
});
