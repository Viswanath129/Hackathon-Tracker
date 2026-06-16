const { logUpdate, getHistory } = require("../../handlers/progress");
const progressService = require("../../services/progressService");

// Mock the service layer
jest.mock("../../services/progressService");

describe("Progress Handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        test("should return 201 when progress is successfully logged", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "Added unit tests",
                    deltaPercentage: 10
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: "2023-10-27T10:00:00Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({
                message: "Progress log created successfully",
                timestamp: "2023-10-27T10:00:00Z"
            });
            expect(progressService.logProgress).toHaveBeenCalledWith("team123", "Added unit tests", 10);
        });

        test("should handle pre-parsed JSON body", async () => {
            const event = {
                body: {
                    teamId: "team123",
                    updateText: "Added unit tests",
                    deltaPercentage: 10
                }
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: "2023-10-27T10:00:00Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(progressService.logProgress).toHaveBeenCalledWith("team123", "Added unit tests", 10);
        });

        test("should return 400 for malformed JSON", async () => {
            const event = {
                body: "{ invalid json"
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("Invalid JSON in request body");
        });

        test("should return 400 when teamId or updateText is missing", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123"
                    // updateText missing
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("Missing teamId or updateText");
        });

        test("should return 400 for invalid deltaPercentage", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "Test",
                    deltaPercentage: "not-a-number"
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("deltaPercentage must be a number between 0 and 100");
        });

        test("should return 500 when service layer fails", async () => {
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
            expect(JSON.parse(response.body).message).toBe("Internal server error");
        });
    });

    describe("getHistory", () => {
        test("should return 200 and logs for a valid teamId", async () => {
            const event = {
                pathParameters: {
                    teamId: "team123"
                }
            };

            const mockLogs = [
                { PK: "PROJ#team123", SK: "LOG#1", update_text: "Update 1" },
                { PK: "PROJ#team123", SK: "LOG#2", update_text: "Update 2" }
            ];

            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith("team123");
        });

        test("should return 400 when teamId is missing in path parameters", async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("Missing teamId in path parameters");
        });

        test("should return 500 when service layer fails", async () => {
            const event = {
                pathParameters: {
                    teamId: "team123"
                }
            };

            progressService.getProgressLogs.mockRejectedValue(new Error("DynamoDB error"));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal server error");
        });
    });
});
