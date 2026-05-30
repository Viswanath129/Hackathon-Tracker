const { logUpdate, getHistory } = require("../../handlers/progress");
const { logProgress, getProgressLogs } = require("../../services/progressService");

jest.mock("../../services/progressService");

describe("Progress Lambda Handlers", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate handler", () => {
        it("should return 201 when progress is successfully logged", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "Finished milestone 1",
                    deltaPercentage: 25
                })
            };

            logProgress.mockResolvedValue({ success: true, timestamp: "2023-10-27T10:00:00Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: "2023-10-27T10:00:00Z" });
            expect(logProgress).toHaveBeenCalledWith("team-123", "Finished milestone 1", 25);
        });

        it("should handle pre-parsed body (object format)", async () => {
            const event = {
                body: {
                    teamId: "team-123",
                    updateText: "Milestone reached"
                }
            };

            logProgress.mockResolvedValue({ success: true });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(logProgress).toHaveBeenCalledWith("team-123", "Milestone reached", undefined);
        });

        it("should return 400 for malformed JSON", async () => {
            const event = {
                body: "{ invalid json }"
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("Invalid JSON in request body");
        });

        it("should return 400 when teamId is missing", async () => {
            const event = {
                body: JSON.stringify({ updateText: "test" })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("teamId is required");
        });

        it("should return 400 for invalid deltaPercentage", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("deltaPercentage must be a numeric value");
        });

        it("should return 500 when service fails", async () => {
            const event = {
                body: JSON.stringify({ teamId: "team-123" })
            };

            logProgress.mockRejectedValue(new Error("DynamoDB error"));

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal server error");
        });
    });

    describe("getHistory handler", () => {
        it("should return 200 with logs for a valid teamId", async () => {
            const event = {
                pathParameters: { teamId: "team-123" }
            };

            const mockLogs = [
                { PK: "PROJ#team-123", SK: "LOG#1", update_text: "Update 1" },
                { PK: "PROJ#team-123", SK: "LOG#2", update_text: "Update 2" }
            ];

            getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(getProgressLogs).toHaveBeenCalledWith("team-123");
        });

        it("should return 400 when teamId path parameter is missing", async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("teamId path parameter is required");
        });

        it("should return 500 when service fails", async () => {
            const event = {
                pathParameters: { teamId: "team-123" }
            };

            getProgressLogs.mockRejectedValue(new Error("DynamoDB error"));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal server error");
        });
    });
});
