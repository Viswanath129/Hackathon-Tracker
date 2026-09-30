const mockJwt = {
    verify: jest.fn()
};
const mockProgressService = {
    logProgress: jest.fn(),
    getProgressLogs: jest.fn(),
    getProjectById: jest.fn()
};
const mockDynamoService = {
    getUser: jest.fn(),
    getAllUsers: jest.fn()
};

jest.mock("../../services/progressService", () => mockProgressService);
jest.mock("../../services/dynamoService", () => mockDynamoService);
jest.mock("jsonwebtoken", () => mockJwt);

const { logUpdate, getHistory } = require("../../handlers/progress");

describe("Lambda Progress Handlers", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: "test-secret" };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe("logUpdate", () => {
        test("returns 400 when body is missing", async () => {
            const event = { httpMethod: "POST" };
            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toMatch(/Missing request body/);
        });

        test("returns 400 when deltaPercentage is a boolean", async () => {
            const event = {
                httpMethod: "POST",
                body: JSON.stringify({
                    teamId: "proj_123",
                    updateText: "Built core module",
                    deltaPercentage: true
                })
            };
            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toMatch(/deltaPercentage/);
        });

        test("returns 401 when auth token is missing", async () => {
            const event = {
                httpMethod: "POST",
                body: JSON.stringify({
                    teamId: "proj_123",
                    updateText: "Built core module",
                    deltaPercentage: 25
                })
            };
            const response = await logUpdate(event);

            expect(response.statusCode).toBe(401);
        });

        test("returns 404 when project does not exist", async () => {
            mockJwt.verify.mockReturnValue({ email: "user@example.com" });
            mockDynamoService.getUser.mockResolvedValue({ email: "user@example.com", _id: "user_1" });
            mockProgressService.getProjectById.mockResolvedValue(null);

            const event = {
                httpMethod: "POST",
                headers: { authorization: "Bearer valid-token" },
                body: JSON.stringify({
                    teamId: "nonexistent_proj",
                    updateText: "Built core module",
                    deltaPercentage: 25
                })
            };
            const response = await logUpdate(event);

            expect(response.statusCode).toBe(404);
            expect(JSON.parse(response.body).message).toBe("Project not found");
        });

        test("returns 403 on BOLA check failure (unowned project)", async () => {
            mockJwt.verify.mockReturnValue({ email: "other@example.com" });
            mockDynamoService.getUser.mockResolvedValue({ email: "other@example.com", _id: "user_2", role: "user" });
            mockProgressService.getProjectById.mockResolvedValue({
                _id: "proj_123",
                teamId: "user_1",
                email: "owner@example.com",
                type: "PROJECT"
            });

            const event = {
                httpMethod: "POST",
                headers: { authorization: "Bearer valid-token" },
                body: JSON.stringify({
                    teamId: "proj_123",
                    updateText: "Attempted unauthorized update",
                    deltaPercentage: 10
                })
            };
            const response = await logUpdate(event);

            expect(response.statusCode).toBe(403);
            expect(JSON.parse(response.body).message).toMatch(/Forbidden/);
        });

        test("returns 201 Created on valid request and authorized user", async () => {
            mockJwt.verify.mockReturnValue({ email: "owner@example.com" });
            mockDynamoService.getUser.mockResolvedValue({ email: "owner@example.com", _id: "user_1", role: "user" });
            mockProgressService.getProjectById.mockResolvedValue({
                _id: "proj_123",
                teamId: "user_1",
                email: "owner@example.com",
                type: "PROJECT"
            });
            mockProgressService.logProgress.mockResolvedValue({ success: true, timestamp: "2026-02-28T00:00:00.000Z" });

            const event = {
                httpMethod: "POST",
                headers: { authorization: "Bearer valid-token" },
                body: JSON.stringify({
                    teamId: "proj_123",
                    updateText: "Implemented user auth",
                    deltaPercentage: 30
                })
            };
            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body).message).toBe("Progress logged successfully");
            expect(mockProgressService.logProgress).toHaveBeenCalledWith("proj_123", "Implemented user auth", 30);
        });

        test("returns 500 internal server error with generic message on throw", async () => {
            mockJwt.verify.mockReturnValue({ email: "owner@example.com" });
            mockDynamoService.getUser.mockResolvedValue({ email: "owner@example.com", _id: "user_1", role: "user" });
            mockProgressService.getProjectById.mockRejectedValue(new Error("DynamoDB connection failed"));

            const event = {
                httpMethod: "POST",
                headers: { authorization: "Bearer valid-token" },
                body: JSON.stringify({
                    teamId: "proj_123",
                    updateText: "Implemented user auth",
                    deltaPercentage: 30
                })
            };
            const response = await logUpdate(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal Server Error");
        });
    });

    describe("getHistory", () => {
        test("returns 404 when project does not exist", async () => {
            mockJwt.verify.mockReturnValue({ email: "user@example.com" });
            mockDynamoService.getUser.mockResolvedValue({ email: "user@example.com", _id: "user_1" });
            mockProgressService.getProjectById.mockResolvedValue(null);

            const event = {
                httpMethod: "GET",
                headers: { authorization: "Bearer valid-token" },
                pathParameters: { teamId: "missing_proj" }
            };
            const response = await getHistory(event);

            expect(response.statusCode).toBe(404);
            expect(JSON.parse(response.body).message).toBe("Project not found");
        });

        test("returns 200 OK with log history for project owner", async () => {
            mockJwt.verify.mockReturnValue({ email: "owner@example.com" });
            mockDynamoService.getUser.mockResolvedValue({ email: "owner@example.com", _id: "user_1", role: "user" });
            mockProgressService.getProjectById.mockResolvedValue({
                _id: "proj_123",
                teamId: "user_1",
                email: "owner@example.com",
                type: "PROJECT"
            });
            const mockLogs = [
                { update_text: "Initial setup", delta_percentage: 10, timestamp: "2026-02-28T00:00:00.000Z" }
            ];
            mockProgressService.getProgressLogs.mockResolvedValue(mockLogs);

            const event = {
                httpMethod: "GET",
                headers: { authorization: "Bearer valid-token" },
                pathParameters: { teamId: "proj_123" }
            };
            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual({ success: true, data: mockLogs });
        });
    });
});
