const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockCheckProjectOwnership = jest.fn();
const mockVerifyToken = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args)
}));

jest.mock('../../utils/auth', () => ({
    verifyToken: (...args) => mockVerifyToken(...args),
    checkProjectOwnership: (...args) => mockCheckProjectOwnership(...args)
}));

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Lambda progress handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate', () => {
        it('should return 201 Created when logging progress successfully', async () => {
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockVerifyToken.mockReturnValue({ _id: 'team_1', email: 'team@test.com' });

            const event = {
                body: JSON.stringify({
                    teamId: 'team_1',
                    updateText: 'Updated backend modules',
                    deltaPercentage: 20
                }),
                headers: {
                    Authorization: 'Bearer valid_token'
                }
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);
            expect(body.message).toBe('Progress update logged successfully');
            expect(response.headers['Access-Control-Allow-Origin']).toBeDefined();
        });

        it('should return 400 Bad Request if request body is missing', async () => {
            const event = {};
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.message).toBe('Missing request body');
        });

        it('should return 400 Bad Request if JSON body is invalid', async () => {
            const event = { body: 'invalid json {' };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.message).toBe('Invalid JSON body');
        });

        it('should return 400 Bad Request if validation fails (e.g. boolean deltaPercentage)', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team_1',
                    updateText: 'Valid text',
                    deltaPercentage: true
                })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.message).toContain('booleans are not allowed');
        });

        it('should return 401 Unauthorized if request has no authentication context', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'team_1',
                    updateText: 'Valid text',
                    deltaPercentage: 10
                })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(401);
            const body = JSON.parse(response.body);
            expect(body.message).toContain('Unauthorized');
        });

        it('should return 403 Forbidden if checkProjectOwnership fails', async () => {
            mockVerifyToken.mockReturnValue({ _id: 'team_other', email: 'other@test.com' });
            mockCheckProjectOwnership.mockResolvedValue(false);

            const event = {
                body: JSON.stringify({
                    teamId: 'team_1',
                    updateText: 'Update text',
                    deltaPercentage: 10
                }),
                headers: {
                    Authorization: 'Bearer valid_token'
                }
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(403);
            const body = JSON.parse(response.body);
            expect(body.message).toBe('Forbidden: Access denied for project');
        });

        it('should return generic 500 on unexpected service error', async () => {
            mockLogProgress.mockRejectedValue(new Error('Internal DynamoDB error'));
            mockVerifyToken.mockReturnValue({ _id: 'team_1', email: 'team@test.com' });
            mockCheckProjectOwnership.mockResolvedValue(true);

            const event = {
                body: JSON.stringify({
                    teamId: 'team_1',
                    updateText: 'Updated backend modules',
                    deltaPercentage: 20
                }),
                headers: {
                    Authorization: 'Bearer valid_token'
                }
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.body);
            expect(body.message).toBe('Internal Server Error');
        });

        it('should handle OPTIONS preflight request', async () => {
            const event = { httpMethod: 'OPTIONS' };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(200);
        });
    });

    describe('getHistory', () => {
        it('should return 200 OK with progress history logs', async () => {
            const mockLogs = [
                { PK: 'PROJ#team_1', SK: 'LOG#2026-03-01', update_text: 'Phase 1', delta_percentage: 25 }
            ];
            mockGetProgressLogs.mockResolvedValue(mockLogs);
            mockVerifyToken.mockReturnValue({ _id: 'team_1', email: 'team@test.com' });
            mockCheckProjectOwnership.mockResolvedValue(true);

            const event = {
                pathParameters: { teamId: 'team_1' },
                headers: { Authorization: 'Bearer valid_token' }
            };

            const response = await getHistory(event);
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body).toEqual(mockLogs);
        });

        it('should return 400 Bad Request if teamId path parameter is missing', async () => {
            const event = { pathParameters: {} };
            const response = await getHistory(event);
            expect(response.statusCode).toBe(400);
        });

        it('should return 401 Unauthorized if request has no authentication context', async () => {
            const event = {
                pathParameters: { teamId: 'team_1' }
            };
            const response = await getHistory(event);
            expect(response.statusCode).toBe(401);
            const body = JSON.parse(response.body);
            expect(body.message).toContain('Unauthorized');
        });

        it('should return generic 500 on unexpected error', async () => {
            mockGetProgressLogs.mockRejectedValue(new Error('DynamoDB failed'));
            mockVerifyToken.mockReturnValue({ _id: 'team_1', email: 'team@test.com' });
            mockCheckProjectOwnership.mockResolvedValue(true);

            const event = {
                pathParameters: { teamId: 'team_1' },
                headers: { Authorization: 'Bearer valid_token' }
            };

            const response = await getHistory(event);
            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.body);
            expect(body.message).toBe('Internal Server Error');
        });
    });
});
