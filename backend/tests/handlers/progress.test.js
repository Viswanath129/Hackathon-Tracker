const progressService = require("../../services/progressService");

// Mock the progress service before requiring the handlers
jest.mock("../../services/progressService");

const { logUpdate, getHistory } = require("../../handlers/progress");

describe("Progress Lambda Handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        it("should return 201 when progress is logged successfully", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "Finished API implementation",
                    deltaPercentage: 25
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: "2023-10-27T10:00:00.000Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toHaveProperty("success", true);
            expect(progressService.logProgress).toHaveBeenCalledWith("team-123", "Finished API implementation", 25);
        });

        it("should return 400 for malformed JSON", async () => {
            const event = {
                body: "{ invalid json }"
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("Invalid JSON format");
        });

        it("should return 400 when required fields are missing", async () => {
            const event = {
                body: JSON.stringify({ teamId: "team-123" })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("required");
        });

        it("should return 400 for invalid deltaPercentage", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "Progress",
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("between 0 and 100");
        });

        it("should return 500 when service fails", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "Progress",
                    deltaPercentage: 50
                })
            };

            progressService.logProgress.mockRejectedValue(new Error("DynamoDB Error"));

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal Server Error");
        });
    });

    describe("getHistory", () => {
        it("should return 200 and history logs", async () => {
            const event = {
                pathParameters: { teamId: "team-123" }
            };

            const mockLogs = [{ update_text: "Log 1", delta_percentage: 10 }];
            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith("team-123");
        });

        it("should return 400 when teamId is missing", async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("teamId is required");
        });

        it("should return 500 when service fails", async () => {
            const event = {
                pathParameters: { teamId: "team-123" }
            };

            progressService.getProgressLogs.mockRejectedValue(new Error("DynamoDB Error"));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal Server Error");
        });
    });
});
