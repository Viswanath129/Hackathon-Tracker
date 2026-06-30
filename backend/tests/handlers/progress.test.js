const { logUpdate, getHistory } = require("../../handlers/progress");
const progressService = require("../../services/progressService");

jest.mock("../../services/progressService");

describe("Progress Handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        test("should successfully log progress", async () => {
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
            const body = JSON.parse(response.body);
            expect(body.message).toBe("Progress logged successfully");
            expect(body.success).toBe(true);
            expect(progressService.logProgress).toHaveBeenCalledWith("team123", "Finished API implementation", 25);
        });

        test("should return 400 if body is missing", async () => {
            const event = {};
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("Request body is missing");
        });

        test("should return 400 if teamId is missing", async () => {
            const event = {
                body: JSON.stringify({
                    updateText: "Something",
                    deltaPercentage: 10
                })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("teamId must be a non-empty string");
        });

        test("should return 400 if deltaPercentage is invalid", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "Something",
                    deltaPercentage: 150
                })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("deltaPercentage must be a numeric value between -100 and 100");
        });

        test("should return 400 for invalid JSON", async () => {
            const event = {
                body: "invalid-json"
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("Invalid JSON in request body");
        });

        test("should return 500 on service error", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "Something",
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
        test("should successfully retrieve history", async () => {
            const event = {
                pathParameters: {
                    teamId: "team123"
                }
            };

            const mockLogs = [
                { PK: "PROJ#team123", SK: "LOG#1", update_text: "Log 1", delta_percentage: 10 },
                { PK: "PROJ#team123", SK: "LOG#2", update_text: "Log 2", delta_percentage: 20 }
            ];

            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.teamId).toBe("team123");
            expect(body.logs).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith("team123");
        });

        test("should return 400 if teamId path parameter is missing", async () => {
            const event = {
                pathParameters: {}
            };
            const response = await getHistory(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("teamId path parameter is required");
        });

        test("should return 500 on service error", async () => {
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
