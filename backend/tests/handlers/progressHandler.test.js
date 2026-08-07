const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockGetUser = jest.fn();
const mockGetAllUsers = jest.fn();
const mockGetProjectById = jest.fn();
const mockJwtVerify = jest.fn();

jest.mock("../../services/progressService", () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args)
}));

jest.mock("../../services/dynamoService", () => ({
    getUser: (...args) => mockGetUser(...args),
    getAllUsers: (...args) => mockGetAllUsers(...args),
    getProjectById: (...args) => mockGetProjectById(...args)
}));

jest.mock("jsonwebtoken", () => ({
    verify: (...args) => mockJwtVerify(...args)
}));

const { logUpdate, getHistory } = require("../../handlers/progress");

describe("Lambda progress handlers", () => {
    let originalEnv;

    beforeAll(() => {
        originalEnv = { ...process.env };
    });

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = "test_secret";
        process.env.CORS_ORIGIN = "http://localhost:5173";
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe("logUpdate", () => {
        it("should return 400 if event body is missing", async () => {
            const event = { body: null };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body)).toEqual({ message: "Request body is missing" });
        });

        it("should return 400 if JSON parsing fails", async () => {
            const event = { body: "invalid json {" };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body)).toEqual({ message: "Invalid JSON format" });
        });

        it("should return 400 if validation fails", async () => {
            const event = { body: JSON.stringify({ teamId: "", updateText: "", deltaPercentage: 10 }) };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
        });

        it("should return 401 if authorization header is missing", async () => {
            const event = {
                body: JSON.stringify({ teamId: "proj123", updateText: "Progress", deltaPercentage: 10 }),
                headers: {}
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(401);
            expect(JSON.parse(response.body)).toEqual({ message: "Not authorized, no token" });
        });

        it("should return 500 if JWT_SECRET is unconfigured", async () => {
            delete process.env.JWT_SECRET;
            const event = {
                body: JSON.stringify({ teamId: "proj123", updateText: "Progress", deltaPercentage: 10 }),
                headers: { Authorization: "Bearer mytoken" }
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body)).toEqual({ message: "Internal Server Error" });
        });

        it("should return 401 if JWT token fails verification", async () => {
            const event = {
                body: JSON.stringify({ teamId: "proj123", updateText: "Progress", deltaPercentage: 10 }),
                headers: { Authorization: "Bearer invalidtoken" }
            };
            mockJwtVerify.mockImplementation(() => {
                throw new Error("Invalid token signature");
            });

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(401);
            expect(JSON.parse(response.body)).toEqual({ message: "Not authorized, token failed" });
        });

        it("should return 404 if project is not found", async () => {
            const event = {
                body: JSON.stringify({ teamId: "proj123", updateText: "Progress", deltaPercentage: 10 }),
                headers: { Authorization: "Bearer validtoken" }
            };
            mockJwtVerify.mockReturnValue({ email: "user@example.com" });
            mockGetUser.mockResolvedValue({ _id: "team_1", email: "user@example.com" });
            mockGetProjectById.mockResolvedValue(null);

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(404);
            expect(JSON.parse(response.body)).toEqual({ message: "Project not found" });
        });

        it("should return 403 if user is not admin and does not own the project", async () => {
            const event = {
                body: JSON.stringify({ teamId: "proj123", updateText: "Progress", deltaPercentage: 10 }),
                headers: { Authorization: "Bearer validtoken" }
            };
            mockJwtVerify.mockReturnValue({ email: "user@example.com" });
            mockGetUser.mockResolvedValue({ _id: "team_other", email: "user@example.com", role: "team" });
            mockGetProjectById.mockResolvedValue({ _id: "proj123", team_id: "team_owner" });

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(403);
            expect(JSON.parse(response.body)).toEqual({ message: "Forbidden: You do not own this project" });
        });

        it("should return 201 on success", async () => {
            const event = {
                body: { teamId: "proj123", updateText: "Progress update", deltaPercentage: 15 },
                headers: { Authorization: "Bearer validtoken" }
            };
            mockJwtVerify.mockReturnValue({ email: "user@example.com" });
            mockGetUser.mockResolvedValue({ _id: "team_owner", email: "user@example.com", role: "team" });
            mockGetProjectById.mockResolvedValue({ _id: "proj123", team_id: "team_owner" });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: "2025-01-01" });

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: "2025-01-01" });
        });
    });

    describe("getHistory", () => {
        it("should return 400 if teamId path parameter is missing", async () => {
            const event = { pathParameters: {} };
            const response = await getHistory(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body)).toEqual({ message: "teamId is required" });
        });

        it("should return 403 if user is not admin and does not own the project", async () => {
            const event = {
                pathParameters: { teamId: "proj123" },
                headers: { Authorization: "Bearer validtoken" }
            };
            mockJwtVerify.mockReturnValue({ email: "user@example.com" });
            mockGetUser.mockResolvedValue({ _id: "team_other", email: "user@example.com", role: "team" });
            mockGetProjectById.mockResolvedValue({ _id: "proj123", team_id: "team_owner" });

            const response = await getHistory(event);
            expect(response.statusCode).toBe(403);
        });

        it("should return 200 on success", async () => {
            const event = {
                pathParameters: { teamId: "proj123" },
                headers: { Authorization: "Bearer validtoken" }
            };
            mockJwtVerify.mockReturnValue({ email: "user@example.com" });
            mockGetUser.mockResolvedValue({ _id: "team_owner", email: "user@example.com", role: "team" });
            mockGetProjectById.mockResolvedValue({ _id: "proj123", team_id: "team_owner" });
            const mockLogs = [{ timestamp: "123", update_text: "test" }];
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);
            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
        });
    });
});
