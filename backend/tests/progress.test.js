// Mock the service before requiring the handlers
jest.mock("../services/progressService");
const progressService = require("../services/progressService");
const { logUpdate, getHistory } = require("../handlers/progress");

describe("Progress Handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        test("successfully logs progress update with string body", async () => {
            const event = {
                body: JSON.stringify({
                    projectId: "proj123",
                    updateText: "Working on feature X",
                    deltaPercentage: 25
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: "2023-10-27T10:00:00Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: "2023-10-27T10:00:00Z" });
            expect(progressService.logProgress).toHaveBeenCalledWith("proj123", "Working on feature X", 25);
        });

        test("successfully logs progress update with object body", async () => {
            const event = {
                body: {
                    projectId: "proj123",
                    updateText: "Working on feature X",
                    deltaPercentage: 25
                }
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: "2023-10-27T10:00:00Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(progressService.logProgress).toHaveBeenCalledWith("proj123", "Working on feature X", 25);
        });

        test("returns 400 if projectId is missing", async () => {
            const event = {
                body: JSON.stringify({
                    updateText: "Missing project ID",
                    deltaPercentage: 10
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("projectId and updateText are required fields.");
        });

        test("returns 400 if updateText is missing", async () => {
            const event = {
                body: JSON.stringify({
                    projectId: "proj123",
                    deltaPercentage: 10
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("projectId and updateText are required fields.");
        });

        test("returns 400 if deltaPercentage is invalid (too high)", async () => {
            const event = {
                body: JSON.stringify({
                    projectId: "proj123",
                    updateText: "Invalid percentage",
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("deltaPercentage must be a numeric value between 0 and 100.");
        });

        test("returns 400 if deltaPercentage is invalid (negative)", async () => {
            const event = {
                body: JSON.stringify({
                    projectId: "proj123",
                    updateText: "Invalid percentage",
                    deltaPercentage: -5
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("deltaPercentage must be a numeric value between 0 and 100.");
        });

        test("returns 400 if deltaPercentage is not a number", async () => {
            const event = {
                body: JSON.stringify({
                    projectId: "proj123",
                    updateText: "Invalid percentage",
                    deltaPercentage: "high"
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("deltaPercentage must be a numeric value between 0 and 100.");
        });

        test("returns 500 if service throws error", async () => {
            const event = {
                body: JSON.stringify({
                    projectId: "proj123",
                    updateText: "Error case"
                })
            };

            progressService.logProgress.mockRejectedValue(new Error("DB Error"));

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("An internal error occurred while logging progress.");
        });
    });

    describe("getHistory", () => {
        test("successfully retrieves progress logs", async () => {
            const event = {
                pathParameters: { teamId: "proj123" }
            };

            const mockLogs = [
                { PK: "PROJ#proj123", SK: "LOG#1", update_text: "Update 1" },
                { PK: "PROJ#proj123", SK: "LOG#2", update_text: "Update 2" }
            ];

            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith("proj123");
        });

        test("returns 400 if teamId is missing", async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("teamId path parameter is required.");
        });

        test("returns 500 if service throws error", async () => {
            const event = {
                pathParameters: { teamId: "proj123" }
            };

            progressService.getProgressLogs.mockRejectedValue(new Error("DB Error"));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("An internal error occurred while fetching progress history.");
        });
    });
});
