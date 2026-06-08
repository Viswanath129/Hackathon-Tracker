const { logUpdate, getHistory } = require("../../handlers/progress");
const { logProgress, getProgressLogs } = require("../../services/progressService");

jest.mock("../../services/progressService");

describe("Progress Handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        it("should return 200 on successful progress log", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "Finished UI",
                    deltaPercentage: 25
                })
            };

            logProgress.mockResolvedValue({ success: true, timestamp: "2023-10-27T10:00:00Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual({
                message: "Progress log created successfully",
                timestamp: "2023-10-27T10:00:00Z"
            });
            expect(logProgress).toHaveBeenCalledWith("team123", "Finished UI", 25);
        });

        it("should handle pre-parsed body object", async () => {
            const event = {
                body: {
                    teamId: "team123",
                    updateText: "Finished UI",
                    deltaPercentage: "25"
                }
            };

            logProgress.mockResolvedValue({ success: true, timestamp: "2023-10-27T10:00:00Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(200);
            expect(logProgress).toHaveBeenCalledWith("team123", "Finished UI", 25);
        });

        it("should return 400 for invalid JSON body", async () => {
            const event = {
                body: "invalid-json"
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("Invalid JSON");
        });

        it("should return 400 for missing fields", async () => {
            const event = {
                body: JSON.stringify({ teamId: "team123" })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("Missing required fields");
        });

        it("should return 400 for invalid deltaPercentage", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "test",
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("numeric value between 0 and 100");
        });

        it("should return 500 on service error", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "test",
                    deltaPercentage: 50
                })
            };

            logProgress.mockRejectedValue(new Error("DynamoDB error"));

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal Server Error");
        });
    });

    describe("getHistory", () => {
        it("should return 200 and progress logs on success", async () => {
            const event = {
                pathParameters: { teamId: "team123" }
            };

            const mockLogs = [
                { PK: "PROJ#team123", SK: "LOG#1", update_text: "log 1" },
                { PK: "PROJ#team123", SK: "LOG#2", update_text: "log 2" }
            ];
            getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(getProgressLogs).toHaveBeenCalledWith("team123");
        });

        it("should return 400 if teamId is missing", async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("Missing teamId");
        });

        it("should return 500 on service error", async () => {
            const event = {
                pathParameters: { teamId: "team123" }
            };

            getProgressLogs.mockRejectedValue(new Error("DynamoDB error"));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal Server Error");
        });
    });
});
