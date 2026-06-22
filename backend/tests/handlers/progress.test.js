const progressService = require("../../services/progressService");

// Mock the progressService
jest.mock("../../services/progressService");

const { logUpdate, getHistory } = require("../../handlers/progress");

describe("Progress Handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        it("should return 201 on successful progress log", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "Finished UI",
                    deltaPercentage: 15
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: "2023-10-27T10:00:00Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: "2023-10-27T10:00:00Z" });
            expect(progressService.logProgress).toHaveBeenCalledWith("team123", "Finished UI", 15);
        });

        it("should return 400 for invalid JSON", async () => {
            const event = {
                body: "{ invalid json }"
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("Invalid JSON");
        });

        it("should return 400 for missing fields", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123"
                    // missing updateText and deltaPercentage
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("Missing required fields");
        });

        it("should return 400 for invalid deltaPercentage", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "Test",
                    deltaPercentage: 150 // Out of range
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("deltaPercentage must be a numeric value between -100 and 100");
        });

        it("should return 500 when service fails", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "Test",
                    deltaPercentage: 10
                })
            };

            progressService.logProgress.mockRejectedValue(new Error("DynamoDB error"));

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal Server Error");
        });
    });

    describe("getHistory", () => {
        it("should return 200 and logs on success", async () => {
            const event = {
                pathParameters: {
                    teamId: "team123"
                }
            };

            const mockLogs = [
                { PK: "PROJ#team123", SK: "LOG#1", update_text: "Log 1" },
                { PK: "PROJ#team123", SK: "LOG#2", update_text: "Log 2" }
            ];

            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith("team123");
        });

        it("should return 400 when teamId is missing", async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("Missing teamId");
        });

        it("should return 500 when service fails", async () => {
            const event = {
                pathParameters: {
                    teamId: "team123"
                }
            };

            progressService.getProgressLogs.mockRejectedValue(new Error("Query failed"));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal Server Error");
        });
    });
});
