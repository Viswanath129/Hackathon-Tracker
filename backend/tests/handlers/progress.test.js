const { logUpdate, getHistory } = require("../../handlers/progress");
const progressService = require("../../services/progressService");

jest.mock("../../services/progressService");

describe("Progress Lambda Handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        it("should return 201 on successful progress log", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "test-team",
                    updateText: "Finished API integration",
                    deltaPercentage: 10
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: "2023-10-27T10:00:00Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: "2023-10-27T10:00:00Z" });
            expect(progressService.logProgress).toHaveBeenCalledWith("test-team", "Finished API integration", 10);
        });

        it("should return 400 if body is missing", async () => {
            const event = {};
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("Request body is missing");
        });

        it("should return 400 if body is malformed JSON", async () => {
            const event = {
                body: "{ invalid json"
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("Invalid JSON in request body");
        });

        it("should return 400 if teamId is missing", async () => {
            const event = {
                body: JSON.stringify({
                    updateText: "Update",
                    deltaPercentage: 5
                })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("teamId must be a non-empty string");
        });

        it("should return 400 if updateText is missing", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-1",
                    deltaPercentage: 5
                })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("updateText must be a non-empty string");
        });

        it("should return 400 if deltaPercentage is invalid", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-1",
                    updateText: "Update",
                    deltaPercentage: "invalid"
                })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("deltaPercentage must be a numeric value between -100 and 100");
        });

        it("should return 400 if deltaPercentage is out of range", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-1",
                    updateText: "Update",
                    deltaPercentage: 150
                })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
        });
    });

    describe("getHistory", () => {
        it("should return 200 and logs for a valid teamId", async () => {
            const event = {
                pathParameters: { teamId: "test-team" }
            };

            const mockLogs = [
                { PK: "PROJ#test-team", SK: "LOG#1", update_text: "Log 1" },
                { PK: "PROJ#test-team", SK: "LOG#2", update_text: "Log 2" }
            ];

            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith("test-team");
        });

        it("should return 400 if teamId is missing in path parameters", async () => {
            const event = { pathParameters: {} };
            const response = await getHistory(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("teamId path parameter is missing");
        });

        it("should return 500 if service throws error", async () => {
            const event = { pathParameters: { teamId: "team-1" } };
            progressService.getProgressLogs.mockRejectedValue(new Error("DynamoDB error"));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal Server Error");
        });
    });
});
