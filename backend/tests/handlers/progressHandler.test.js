const jwt = require('jsonwebtoken');
const { logUpdate, getHistory } = require('../../handlers/progress');
const dynamoService = require('../../services/dynamoService');
const { logProgress, getProgressLogs } = require('../../services/progressService');

jest.mock('../../services/dynamoService');
jest.mock('../../services/progressService');

describe('Lambda progress handler', () => {
    const SECRET = 'testsecret';
    let validToken;

    beforeAll(() => {
        process.env.JWT_SECRET = SECRET;
        validToken = jwt.sign({ email: 'team@example.com' }, SECRET);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate', () => {
        it('should return 401 if Authorization header is missing', async () => {
            const event = { headers: {}, body: JSON.stringify({ teamId: 'proj123', updateText: 'test', deltaPercentage: 10 }) };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body)).toEqual({ message: 'Not authorized, no token' });
        });

        it('should return 401 if JWT token is invalid', async () => {
            const event = {
                headers: { Authorization: 'Bearer invalidtoken' },
                body: JSON.stringify({ teamId: 'proj123', updateText: 'test', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body)).toEqual({ message: 'Not authorized, token failed' });
        });

        it('should return 400 if body is missing or unparseable', async () => {
            const event = { headers: { Authorization: `Bearer ${validToken}` }, body: null };
            dynamoService.getUser.mockResolvedValue({ _id: 'team123', email: 'team@example.com' });

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body)).toEqual({ message: 'Request body is required' });
        });

        it('should return 404 if project is not found', async () => {
            const event = {
                headers: { Authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'proj123', updateText: 'test', deltaPercentage: 10 })
            };
            dynamoService.getUser.mockResolvedValue({ _id: 'team123', email: 'team@example.com' });
            dynamoService.getProjectById.mockResolvedValue(null);

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(404);
            expect(JSON.parse(res.body)).toEqual({ message: 'Project not found' });
        });

        it('should return 403 on BOLA ownership mismatch', async () => {
            const event = {
                headers: { Authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'proj123', updateText: 'test', deltaPercentage: 10 })
            };
            dynamoService.getUser.mockResolvedValue({ _id: 'team123', email: 'team@example.com' });
            dynamoService.getProjectById.mockResolvedValue({ _id: 'proj123', team_id: 'otherTeam', email: 'other@example.com' });

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body)).toEqual({ message: 'Forbidden: You do not own this project' });
        });

        it('should return 201 on success', async () => {
            const event = {
                headers: { Authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'proj123', updateText: 'Build complete', deltaPercentage: 50 })
            };
            dynamoService.getUser.mockResolvedValue({ _id: 'team123', email: 'team@example.com', team_name: 'Alpha' });
            dynamoService.getProjectById.mockResolvedValue({ _id: 'proj123', team_id: 'team123', email: 'team@example.com' });
            logProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T12:00:00.000Z' });
            dynamoService.saveActivity.mockResolvedValue({});

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            expect(JSON.parse(res.body)).toEqual({
                message: 'Progress update logged successfully',
                timestamp: '2026-02-28T12:00:00.000Z'
            });
        });
    });

    describe('getHistory', () => {
        it('should return 200 and progress logs on success', async () => {
            const event = {
                headers: { Authorization: `Bearer ${validToken}` },
                pathParameters: { teamId: 'proj123' }
            };
            dynamoService.getUser.mockResolvedValue({ _id: 'team123', email: 'team@example.com' });
            dynamoService.getProjectById.mockResolvedValue({ _id: 'proj123', team_id: 'team123' });
            const mockLogs = [{ SK: 'LOG#1', update_text: 'Started', delta_percentage: 10 }];
            getProgressLogs.mockResolvedValue(mockLogs);

            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body)).toEqual(mockLogs);
        });
    });
});
