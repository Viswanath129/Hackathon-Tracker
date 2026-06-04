const { logUpdate, getHistory } = require("../../handlers/progress");
const { logProgress, getProgressLogs } = require("../../services/progressService");

jest.mock("../../services/progressService");

describe("Progress Handlers", () => {
    describe("logUpdate", () => {
        it("should return 200 on successful progress log", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "Finished UI",
                    deltaPercentage: 25
                })
            };

            logProgress.mockResolvedValue({ success: true, timestamp: "2023-10-27T10:00:00Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: "2023-10-27T10:00:00Z" });
        });

        it("should handle pre-parsed body", async () => {
            const event = {
                body: {
                    teamId: "team-123",
                    updateText: "Finished UI",
                    deltaPercentage: "25"
                }
            };

            logProgress.mockResolvedValue({ success: true });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(200);
            expect(logProgress).toHaveBeenCalledWith("team-123", "Finished UI", 25);
        });

        it("should return 400 for missing fields", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123"
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("Missing required fields");
        });

        it("should return 400 for invalid deltaPercentage", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "Test",
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("deltaPercentage must be a number between 0 and 100");
        });

        it("should return 400 for malformed JSON", async () => {
            const event = {
                body: "{ invalid json }"
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("Invalid JSON in request body");
        });

        it("should return 500 on service error", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "Test",
                    deltaPercentage: 10
                })
            };

            logProgress.mockRejectedValue(new Error("DynamoDB error"));

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal server error");
        });
    });

    describe("getHistory", () => {
        it("should return 200 and logs for a valid teamId", async () => {
            const event = {
                pathParameters: {
                    teamId: "team-123"
                }
            };

            const mockLogs = [
                { PK: "PROJ#team-123", SK: "LOG#1", update_text: "Log 1" },
                { PK: "PROJ#team-123", SK: "LOG#2", update_text: "Log 2" }
            ];

            getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.teamId).toBe("team-123");
            expect(body.logs).toEqual(mockLogs);
        });

        it("should return 400 if teamId is missing", async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("teamId is required in path");
        });

        it("should return 500 on service error", async () => {
            const event = {
                pathParameters: {
                    teamId: "team-123"
                }
            };

            getProgressLogs.mockRejectedValue(new Error("Query failed"));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal server error");
        });
    });
});
