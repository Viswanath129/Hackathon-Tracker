const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock("../../services/progressService", () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

const jwt = require("jsonwebtoken");
const { logUpdate, getHistory } = require("../../handlers/progress");

describe("Progress Lambda Handlers", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: "test-secret" };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe("logUpdate Handler", () => {
        test("returns 400 if event or body is missing", async () => {
            const resNull = await logUpdate(null);
            expect(resNull.statusCode).toBe(400);
            expect(JSON.parse(resNull.body).message).toBe("Missing request body");

            const resEmpty = await logUpdate({});
            expect(resEmpty.statusCode).toBe(400);
            expect(JSON.parse(resEmpty.body).message).toBe("Missing request body");
        });

        test("returns 400 on invalid JSON input", async () => {
            const res = await logUpdate({ body: "{ invalid json " });
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe("Invalid JSON in request body");
        });

        test("returns 400 when validation fails", async () => {
            const res = await logUpdate({
                body: JSON.stringify({ teamId: "team123", updateText: "", deltaPercentage: 10 })
            });
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe("updateText is required and must be a non-empty string");
        });

        test("successfully logs progress and returns 201", async () => {
            mockLogProgress.mockResolvedValue({ success: true, timestamp: "2026-02-28T00:00:00.000Z" });

            const payload = {
                teamId: "team123",
                updateText: "Added backend authentication",
                deltaPercentage: 25
            };

            const res = await logUpdate({ body: JSON.stringify(payload) });
            expect(res.statusCode).toBe(201);

            const body = JSON.parse(res.body);
            expect(body.message).toBe("Progress update logged successfully");
            expect(body.data).toEqual({ success: true, timestamp: "2026-02-28T00:00:00.000Z" });
            expect(mockLogProgress).toHaveBeenCalledWith("team123", "Added backend authentication", 25);
        });

        test("returns 500 when logProgress throws an error", async () => {
            mockLogProgress.mockRejectedValue(new Error("DynamoDB connection failed"));

            const payload = {
                teamId: "team123",
                updateText: "Added backend authentication",
                deltaPercentage: 25
            };

            const res = await logUpdate({ body: JSON.stringify(payload) });
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).message).toBe("Internal Server Error");
        });
    });

    describe("getHistory Handler", () => {
        test("returns 401 if Authorization header is missing", async () => {
            const res = await getHistory({ pathParameters: { teamId: "team123" } });
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body).message).toBe("Authorization token required");
        });

        test("returns 401 if token is invalid or expired", async () => {
            const res = await getHistory({
                headers: { Authorization: "Bearer invalid-token" },
                pathParameters: { teamId: "team123" }
            });
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body).message).toBe("Invalid or expired token");
        });

        test("returns 400 if teamId path parameter is missing", async () => {
            const validToken = jwt.sign({ user: "test" }, "test-secret");
            const res = await getHistory({
                headers: { Authorization: `Bearer ${validToken}` },
                pathParameters: {}
            });
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe("teamId path parameter is required");
        });

        test("successfully returns progress history and 200 OK", async () => {
            const mockLogs = [
                { PK: "PROJ#team123", SK: "LOG#2026-02-28T00:00:00.000Z", update_text: "Updated API", delta_percentage: 15 }
            ];
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            const validToken = jwt.sign({ user: "test" }, "test-secret");
            const res = await getHistory({
                headers: { Authorization: `Bearer ${validToken}` },
                pathParameters: { teamId: "team123" }
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.teamId).toBe("team123");
            expect(body.logs).toEqual(mockLogs);
            expect(mockGetProgressLogs).toHaveBeenCalledWith("team123");
        });

        test("returns 500 when process.env.JWT_SECRET is missing", async () => {
            delete process.env.JWT_SECRET;
            const res = await getHistory({
                headers: { Authorization: "Bearer valid-format-token" },
                pathParameters: { teamId: "team123" }
            });
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).message).toBe("Internal Server Error");
        });

        test("returns 500 when getProgressLogs service throws an error", async () => {
            const validToken = jwt.sign({ user: "test" }, "test-secret");
            mockGetProgressLogs.mockRejectedValue(new Error("DynamoDB Query Error"));

            const res = await getHistory({
                headers: { Authorization: `Bearer ${validToken}` },
                pathParameters: { teamId: "team123" }
            });

            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).message).toBe("Internal Server Error");
        });
    });
});
