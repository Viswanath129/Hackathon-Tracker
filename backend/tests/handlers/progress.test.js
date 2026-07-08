const { logUpdate, getHistory } = require("../../handlers/progress");
const { logProgress, getProgressLogs } = require("../../services/progressService");

// Mock the progress service
jest.mock("../../services/progressService");

describe("Progress Lambda Handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        test("should return 201 on successful progress logging", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "Finished UI",
                    deltaPercentage: 10
                })
            };

            logProgress.mockResolvedValue({ success: true, timestamp: "2023-01-01T00:00:00Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);
            expect(body.message).toBe("Progress logged successfully");
            expect(logProgress).toHaveBeenCalledWith("team123", "Finished UI", 10);
        });

        test("should return 400 if teamId is missing", async () => {
            const event = {
                body: JSON.stringify({
                    updateText: "Finished UI",
                    deltaPercentage: 10
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("teamId is required");
        });

        test("should return 400 if updateText is missing", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    deltaPercentage: 10
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("updateText is required");
        });

        test("should return 400 if deltaPercentage is invalid", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "Finished UI",
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("deltaPercentage must be a numeric value between -100 and 100");
        });

        test("should return 400 if body is invalid JSON", async () => {
            const event = {
                body: "invalid-json"
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("Invalid JSON in request body");
        });

        test("should return 500 if service throws error", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "Finished UI",
                    deltaPercentage: 10
                })
            };

            logProgress.mockRejectedValue(new Error("DynamoDB error"));

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal Server Error");
        });
    });

    describe("getHistory", () => {
        test("should return 200 and logs for valid teamId", async () => {
            const event = {
                pathParameters: { teamId: "team123" }
            };

            const mockLogs = [
                { PK: "PROJ#team123", SK: "LOG#1", update_text: "Log 1", delta_percentage: 5 },
                { PK: "PROJ#team123", SK: "LOG#2", update_text: "Log 2", delta_percentage: 10 }
            ];

            getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.teamId).toBe("team123");
            expect(body.logs).toEqual(mockLogs);
            expect(getProgressLogs).toHaveBeenCalledWith("team123");
        });

        test("should return 400 if teamId is missing in path parameters", async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("teamId is required");
        });

        test("should return 500 if service throws error", async () => {
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
