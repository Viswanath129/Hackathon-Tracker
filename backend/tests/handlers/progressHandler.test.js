const jwt = require('jsonwebtoken');
const { logUpdate, getHistory } = require('../../handlers/progress');
const dynamoService = require('../../services/dynamoService');
const progressService = require('../../services/progressService');

jest.mock('../../services/dynamoService');
jest.mock('../../services/progressService');

describe('Lambda progress handler', () => {
    const SECRET = 'testsecretkey123';
    let validToken;

    beforeAll(() => {
        process.env.JWT_SECRET = SECRET;
        validToken = jwt.sign({ email: 'user@example.com' }, SECRET);
    });

    afterAll(() => {
        delete process.env.JWT_SECRET;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate', () => {
        it('should return 401 if Authorization header is missing', async () => {
            const event = { headers: {} };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body).message).toBe('Not authorized, no token');
        });

        it('should return 401 if token verification fails', async () => {
            const event = {
                headers: { Authorization: 'Bearer invalidtoken' },
                body: JSON.stringify({ teamId: 'proj123', updateText: 'Text', deltaPercentage: 5 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body).message).toBe('Not authorized, token failed');
        });

        it('should return 400 if event body is missing', async () => {
            dynamoService.getUser.mockResolvedValue({ email: 'user@example.com', _id: 'user123' });
            const event = {
                headers: { Authorization: `Bearer ${validToken}` }
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Request body missing');
        });

        it('should return 400 if body is invalid JSON', async () => {
            dynamoService.getUser.mockResolvedValue({ email: 'user@example.com', _id: 'user123' });
            const event = {
                headers: { Authorization: `Bearer ${validToken}` },
                body: 'invalid-json-{{'
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Invalid JSON body');
        });

        it('should return 400 if input validation fails', async () => {
            dynamoService.getUser.mockResolvedValue({ email: 'user@example.com', _id: 'user123' });
            const event = {
                headers: { Authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'proj123', updateText: '', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toContain('updateText');
        });

        it('should return 404 if project is not found', async () => {
            dynamoService.getUser.mockResolvedValue({ email: 'user@example.com', _id: 'user123' });
            dynamoService.getProjectById.mockResolvedValue(null);

            const event = {
                headers: { Authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'proj999', updateText: 'Valid text', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(404);
            expect(JSON.parse(res.body).message).toBe('Project not found');
        });

        it('should return 403 if project does not belong to user (BOLA check)', async () => {
            dynamoService.getUser.mockResolvedValue({ email: 'user@example.com', _id: 'user123' });
            dynamoService.getProjectById.mockResolvedValue({ _id: 'proj123', teamId: 'otherUser' });

            const event = {
                headers: { Authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'proj123', updateText: 'Valid text', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body).message).toBe('Forbidden: Access denied');
        });

        it('should return 201 Created on successful progress logging', async () => {
            dynamoService.getUser.mockResolvedValue({ email: 'user@example.com', _id: 'user123' });
            dynamoService.getProjectById.mockResolvedValue({ _id: 'proj123', teamId: 'user123' });
            progressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T12:00:00.000Z' });

            const event = {
                headers: { Authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'proj123', updateText: 'Valid text', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            expect(JSON.parse(res.body)).toEqual(expect.objectContaining({
                message: 'Progress update logged successfully',
                success: true
            }));
        });

        it('should return 500 Internal Server Error on unexpected exceptions', async () => {
            dynamoService.getUser.mockResolvedValue({ email: 'user@example.com', _id: 'user123' });
            dynamoService.getProjectById.mockRejectedValue(new Error('DynamoDB Connection Failure'));

            const event = {
                headers: { Authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'proj123', updateText: 'Valid text', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory', () => {
        it('should return 401 if Authorization token is missing', async () => {
            const event = {
                pathParameters: { teamId: 'proj123' }
            };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(401);
        });

        it('should return 404 if project is not found', async () => {
            dynamoService.getUser.mockResolvedValue({ email: 'user@example.com', _id: 'user123' });
            dynamoService.getProjectById.mockResolvedValue(null);

            const event = {
                headers: { Authorization: `Bearer ${validToken}` },
                pathParameters: { teamId: 'proj999' }
            };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(404);
            expect(JSON.parse(res.body).message).toBe('Project not found');
        });

        it('should return 403 if project ownership check fails', async () => {
            dynamoService.getUser.mockResolvedValue({ email: 'user@example.com', _id: 'user123' });
            dynamoService.getProjectById.mockResolvedValue({ _id: 'proj123', teamId: 'otherUser' });

            const event = {
                headers: { Authorization: `Bearer ${validToken}` },
                pathParameters: { teamId: 'proj123' }
            };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body).message).toBe('Forbidden: Access denied');
        });

        it('should return 200 OK with progress history logs', async () => {
            dynamoService.getUser.mockResolvedValue({ email: 'user@example.com', _id: 'user123' });
            dynamoService.getProjectById.mockResolvedValue({ _id: 'proj123', teamId: 'user123' });
            const mockLogs = [{ SK: 'LOG#1', update_text: 'Text', delta_percentage: 10 }];
            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const event = {
                headers: { Authorization: `Bearer ${validToken}` },
                pathParameters: { teamId: 'proj123' }
            };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body)).toEqual(mockLogs);
        });
    });
});
