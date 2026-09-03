const jwt = require("jsonwebtoken");

// Mock progressService and dynamoService before requiring handlers
jest.mock("../../services/progressService", () => ({
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
}));

jest.mock("../../services/dynamoService", () => ({
    getProjectById: jest.fn()
}));

const { logProgress, getProgressLogs } = require("../../services/progressService");
const { getProjectById } = require("../../services/dynamoService");
const { logUpdate, getHistory } = require("../../handlers/progress");

describe("Lambda Handler: progress.js", () => {
    const JWT_SECRET = "testsecret123";
    const validUser = { email: "user@example.com", _id: "user123", role: "team" };
    let validToken;

    beforeAll(() => {
        process.env.JWT_SECRET = JWT_SECRET;
        validToken = jwt.sign(validUser, JWT_SECRET);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        it("should return 400 if event body is missing", async () => {
            const event = {
                httpMethod: "POST",
                headers: { Authorization: `Bearer ${validToken}` }
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toMatch(/Missing body/);
        });

        it("should return 400 if event body is invalid JSON", async () => {
            const event = {
                httpMethod: "POST",
                headers: { Authorization: `Bearer ${validToken}` },
                body: "{invalid-json"
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toMatch(/Invalid JSON/);
        });

        it("should return 400 if validation fails (e.g. boolean deltaPercentage)", async () => {
            const event = {
                httpMethod: "POST",
                headers: { Authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: "proj1", updateText: "Done", deltaPercentage: true })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
        });

        it("should return 401 if Authorization header is missing", async () => {
            const event = {
                httpMethod: "POST",
                body: JSON.stringify({ teamId: "proj1", updateText: "Done", deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
        });

        it("should return 403 if user does not own project (BOLA failure)", async () => {
            getProjectById.mockResolvedValue({ _id: "proj1", teamEmail: "other@example.com" });
            const event = {
                httpMethod: "POST",
                headers: { Authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: "proj1", updateText: "Done", deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
        });

        it("should return 201 on successful progress logging", async () => {
            getProjectById.mockResolvedValue({ _id: "proj1", teamEmail: "user@example.com" });
            logProgress.mockResolvedValue({ success: true, timestamp: "2026-03-01T00:00:00Z" });

            const event = {
                httpMethod: "POST",
                headers: { Authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: "proj1", updateText: "Done feature A", deltaPercentage: 15 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            expect(logProgress).toHaveBeenCalledWith("proj1", "Done feature A", 15);
        });
    });

    describe("getHistory", () => {
        it("should return 400 if teamId path parameter is missing", async () => {
            const event = {
                httpMethod: "GET",
                headers: { Authorization: `Bearer ${validToken}` }
            };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(400);
        });

        it("should return 200 with log list on success", async () => {
            getProjectById.mockResolvedValue({ _id: "proj1", teamEmail: "user@example.com" });
            const mockLogs = [{ SK: "LOG#1", update_text: "Update 1", delta_percentage: 10 }];
            getProgressLogs.mockResolvedValue(mockLogs);

            const event = {
                httpMethod: "GET",
                pathParameters: { teamId: "proj1" },
                headers: { Authorization: `Bearer ${validToken}` }
            };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.teamId).toBe("proj1");
            expect(body.logs).toEqual(mockLogs);
        });
    });
});
