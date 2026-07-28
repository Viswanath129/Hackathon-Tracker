// Mock service modules BEFORE requiring the handlers
jest.mock("../../services/progressService", () => ({
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
}));

const { logUpdate, getHistory } = require("../../handlers/progress");
const { logProgress, getProgressLogs } = require("../../services/progressService");

describe("Progress Lambda Handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate handler", () => {
        test("should return 400 when event body is missing", async () => {
            const event = {};
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body)).toEqual({ message: "Missing request body" });
        });

        test("should return 400 when event body is invalid JSON", async () => {
            const event = { body: "{invalid-json" };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body)).toEqual({ message: "Invalid JSON format" });
        });

        test("should return 400 when validation fails (missing teamId)", async () => {
            const event = {
                body: JSON.stringify({
                    updateText: "Worked on UI",
                    deltaPercentage: 10
                })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toContain("teamId");
        });

        test("should return 400 when validation fails (deltaPercentage is boolean)", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "proj-123",
                    updateText: "Worked on UI",
                    deltaPercentage: true
                })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toContain("deltaPercentage");
        });

        test("should return 201 and successfully log progress", async () => {
            logProgress.mockResolvedValue({ success: true });
            const event = {
                body: JSON.stringify({
                    teamId: "proj-123",
                    updateText: "Worked on DB",
                    deltaPercentage: 25
                })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            expect(JSON.parse(res.body)).toEqual({ message: "Progress logged successfully" });
            expect(logProgress).toHaveBeenCalledWith("proj-123", "Worked on DB", 25);
        });

        test("should return 500 when logProgress service fails", async () => {
            logProgress.mockRejectedValue(new Error("Database connection failed"));
            const event = {
                body: JSON.stringify({
                    teamId: "proj-123",
                    updateText: "Worked on DB",
                    deltaPercentage: 25
                })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body)).toEqual({ message: "Internal Server Error" });
        });
    });

    describe("getHistory handler", () => {
        test("should return 400 when teamId path parameter is missing", async () => {
            const event = {};
            const res = await getHistory(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body)).toEqual({ message: "Missing teamId" });
        });

        test("should return 200 with history logs when valid", async () => {
            const mockLogs = [
                { PK: "PROJ#proj-123", SK: "LOG#1", update_text: "Update 1", delta_percentage: 10 }
            ];
            getProgressLogs.mockResolvedValue(mockLogs);
            const event = {
                pathParameters: {
                    teamId: "proj-123"
                }
            };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body)).toEqual(mockLogs);
            expect(getProgressLogs).toHaveBeenCalledWith("proj-123");
        });

        test("should return 500 when service fails", async () => {
            getProgressLogs.mockRejectedValue(new Error("DynamoDB Query Error"));
            const event = {
                pathParameters: {
                    teamId: "proj-123"
                }
            };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body)).toEqual({ message: "Internal Server Error" });
        });
    });
});
