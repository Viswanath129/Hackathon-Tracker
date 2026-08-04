// Mocking services before requiring handlers with correct variable prefixes
const mockDynamoService = {
    getUser: jest.fn(),
    getAllUsers: jest.fn(),
    getAllProjects: jest.fn()
};
const mockProgressService = {
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
};

jest.mock('../../services/dynamoService', () => mockDynamoService);
jest.mock('../../services/progressService', () => mockProgressService);

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('progress Lambda Handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logUpdate handler', () => {
        test('should return 400 when event or body is missing', async () => {
            const event = {};
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body)).toEqual({ message: 'Request body is missing' });
        });

        test('should return 400 when body is not a valid JSON string', async () => {
            const event = { body: '{invalid-json' };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body)).toEqual({ message: 'Invalid JSON format' });
        });

        test('should return 400 when validation fails (e.g. missing teamId)', async () => {
            const event = {
                body: JSON.stringify({
                    updateText: 'No team id',
                    deltaPercentage: 5
                })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body)).toEqual(expect.objectContaining({
                message: expect.any(String)
            }));
        });

        test('should return 401 when email is missing in Cognito claims context', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'proj_123',
                    updateText: 'Did some work',
                    deltaPercentage: 10
                }),
                requestContext: {
                    authorizer: {
                        claims: {}
                    }
                }
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(401);
            expect(JSON.parse(response.body)).toEqual({ message: 'Unauthorized: Missing user identity' });
        });

        test('should return 401 when user is not found in database', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'proj_123',
                    updateText: 'Did some work',
                    deltaPercentage: 10
                }),
                requestContext: {
                    authorizer: {
                        claims: {
                            email: 'user@gmail.com'
                        }
                    }
                }
            };
            mockDynamoService.getUser.mockResolvedValue(null);
            mockDynamoService.getAllUsers.mockResolvedValue([]);

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(401);
            expect(JSON.parse(response.body)).toEqual({ message: 'Unauthorized: User not found in database' });
        });

        test('should return 404 when project is not found', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'proj_not_found',
                    updateText: 'Did some work',
                    deltaPercentage: 10
                }),
                requestContext: {
                    authorizer: {
                        claims: {
                            email: 'user@gmail.com'
                        }
                    }
                }
            };
            mockDynamoService.getUser.mockResolvedValue({ _id: 'user_123', email: 'user@gmail.com', role: 'user' });
            mockDynamoService.getAllProjects.mockResolvedValue([]);

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(404);
            expect(JSON.parse(response.body)).toEqual({ message: 'Project not found' });
        });

        test('should return 403 when user is not admin and does not own the project', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'proj_other_team',
                    updateText: 'Did some work',
                    deltaPercentage: 10
                }),
                requestContext: {
                    authorizer: {
                        claims: {
                            email: 'user@gmail.com'
                        }
                    }
                }
            };
            mockDynamoService.getUser.mockResolvedValue({ _id: 'user_123', email: 'user@gmail.com', role: 'user' });
            mockDynamoService.getAllProjects.mockResolvedValue([
                { _id: 'proj_other_team', team_id: 'another_user_id', type: 'PROJECT' }
            ]);

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(403);
            expect(JSON.parse(response.body)).toEqual({ message: 'Forbidden: You do not own this project' });
        });

        test('should return 201 when user is authorized and owns the project', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'proj_my_team',
                    updateText: 'Successfully deployed lambda',
                    deltaPercentage: 20
                }),
                requestContext: {
                    authorizer: {
                        claims: {
                            email: 'user@gmail.com'
                        }
                    }
                }
            };
            mockDynamoService.getUser.mockResolvedValue({ _id: 'user_123', email: 'user@gmail.com', role: 'user' });
            mockDynamoService.getAllProjects.mockResolvedValue([
                { _id: 'proj_my_team', team_id: 'user_123', type: 'PROJECT' }
            ]);
            mockProgressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-08-04T13:00:00.000Z' });

            const response = await logUpdate(event);
            expect(mockProgressService.logProgress).toHaveBeenCalledWith('proj_my_team', 'Successfully deployed lambda', 20);
            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: '2026-08-04T13:00:00.000Z' });
        });

        test('should fallback to username claim or nested member array', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'proj_my_team',
                    updateText: 'Logged in as team member',
                    deltaPercentage: 12
                }),
                requestContext: {
                    authorizer: {
                        claims: {
                            username: 'member@gmail.com'
                        }
                    }
                }
            };
            mockDynamoService.getUser.mockResolvedValue(null);
            mockDynamoService.getAllUsers.mockResolvedValue([
                { _id: 'user_team_123', email: 'owner@gmail.com', role: 'user', members: [{ email: 'member@gmail.com' }] }
            ]);
            mockDynamoService.getAllProjects.mockResolvedValue([
                { _id: 'proj_my_team', team_id: 'user_team_123', type: 'PROJECT' }
            ]);
            mockProgressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-08-04T13:00:00.000Z' });

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: '2026-08-04T13:00:00.000Z' });
        });

        test('should return 500 when handler crashes', async () => {
            const event = {
                body: JSON.stringify({
                    teamId: 'proj_my_team',
                    updateText: 'Failing update',
                    deltaPercentage: 10
                }),
                requestContext: {
                    authorizer: {
                        claims: {
                            email: 'user@gmail.com'
                        }
                    }
                }
            };
            mockDynamoService.getUser.mockRejectedValue(new Error('Internal Exception'));

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body)).toEqual({ message: 'Internal Server Error' });
        });
    });

    describe('getHistory handler', () => {
        test('should return 400 when teamId path parameter is missing', async () => {
            const event = {
                pathParameters: {}
            };
            const response = await getHistory(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body)).toEqual({ message: 'teamId parameter is required' });
        });

        test('should return 401 when unauthorized/no email', async () => {
            const event = {
                pathParameters: { teamId: 'proj_123' },
                requestContext: {
                    authorizer: {
                        claims: {}
                    }
                }
            };
            const response = await getHistory(event);
            expect(response.statusCode).toBe(401);
            expect(JSON.parse(response.body)).toEqual({ message: 'Unauthorized: Missing user identity' });
        });

        test('should return 404 when project is not found', async () => {
            const event = {
                pathParameters: { teamId: 'proj_not_found' },
                requestContext: {
                    authorizer: {
                        claims: {
                            email: 'user@gmail.com'
                        }
                    }
                }
            };
            mockDynamoService.getUser.mockResolvedValue({ _id: 'user_123', email: 'user@gmail.com', role: 'user' });
            mockDynamoService.getAllProjects.mockResolvedValue([]);

            const response = await getHistory(event);
            expect(response.statusCode).toBe(404);
            expect(JSON.parse(response.body)).toEqual({ message: 'Project not found' });
        });

        test('should return 403 when user is not admin and does not own the project', async () => {
            const event = {
                pathParameters: { teamId: 'proj_other_team' },
                requestContext: {
                    authorizer: {
                        claims: {
                            email: 'user@gmail.com'
                        }
                    }
                }
            };
            mockDynamoService.getUser.mockResolvedValue({ _id: 'user_123', email: 'user@gmail.com', role: 'user' });
            mockDynamoService.getAllProjects.mockResolvedValue([
                { _id: 'proj_other_team', team_id: 'another_user_id', type: 'PROJECT' }
            ]);

            const response = await getHistory(event);
            expect(response.statusCode).toBe(403);
            expect(JSON.parse(response.body)).toEqual({ message: 'Forbidden: You do not own this project' });
        });

        test('should return 200 with logs when user is authorized', async () => {
            const event = {
                pathParameters: { teamId: 'proj_my_team' },
                requestContext: {
                    authorizer: {
                        claims: {
                            email: 'user@gmail.com'
                        }
                    }
                }
            };
            mockDynamoService.getUser.mockResolvedValue({ _id: 'user_123', email: 'user@gmail.com', role: 'user' });
            mockDynamoService.getAllProjects.mockResolvedValue([
                { _id: 'proj_my_team', team_id: 'user_123', type: 'PROJECT' }
            ]);
            const mockLogs = [
                { PK: 'PROJ#proj_my_team', SK: 'LOG#2026', update_text: 'Log entry', delta_percentage: 15 }
            ];
            mockProgressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);
            expect(mockProgressService.getProgressLogs).toHaveBeenCalledWith('proj_my_team');
            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
        });

        test('should return 500 when handler crashes', async () => {
            const event = {
                pathParameters: { teamId: 'proj_my_team' },
                requestContext: {
                    authorizer: {
                        claims: {
                            email: 'user@gmail.com'
                        }
                    }
                }
            };
            mockDynamoService.getUser.mockRejectedValue(new Error('Internal Database Exception'));

            const response = await getHistory(event);
            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body)).toEqual({ message: 'Internal Server Error' });
        });
    });
});
