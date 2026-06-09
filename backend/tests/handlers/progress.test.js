const { logUpdate, getHistory } = require("../../handlers/progress");
const progressService = require("../../services/progressService");

jest.mock("../../services/progressService");

describe("Progress Handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        it("should log progress successfully with a JSON string body", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "Finished API implementation",
                    deltaPercentage: 25
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: "2023-10-27T10:00:00Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: "2023-10-27T10:00:00Z" });
            expect(progressService.logProgress).toHaveBeenCalledWith("team123", "Finished API implementation", 25);
        });

        it("should log progress successfully with an object body", async () => {
            const event = {
                body: {
                    teamId: "team123",
                    updateText: "Finished API implementation",
                    deltaPercentage: "25.5"
                }
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: "2023-10-27T10:00:00Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(progressService.logProgress).toHaveBeenCalledWith("team123", "Finished API implementation", 25.5);
        });

        it("should return 400 if required fields are missing", async () => {
            const event = {
                body: JSON.stringify({ teamId: "team123" })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("Missing required fields");
        });

        it("should return 400 if deltaPercentage is invalid", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "Update",
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("deltaPercentage must be a number between 0 and 100");
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
                    teamId: "team123",
                    updateText: "Update",
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
        it("should fetch progress history successfully", async () => {
            const event = {
                pathParameters: { teamId: "team123" }
            };

            const mockLogs = [
                { PK: "PROJ#team123", SK: "LOG#1", update_text: "Log 1", delta_percentage: 10 },
                { PK: "PROJ#team123", SK: "LOG#2", update_text: "Log 2", delta_percentage: 20 }
            ];

            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith("team123");
        });

        it("should return 400 if teamId is missing", async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("teamId path parameter is required");
        });

        it("should return 500 on service error", async () => {
            const event = {
                pathParameters: { teamId: "team123" }
            };

            progressService.getProgressLogs.mockRejectedValue(new Error("DynamoDB error"));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal Server Error");
        });
    });
});
