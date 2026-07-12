const { logUpdate, getHistory } = require("../../handlers/progress");
const { logProgress, getProgressLogs } = require("../../services/progressService");

jest.mock("../../services/progressService");

describe("Progress Lambda Handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        it("should return 201 on successful progress log", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "Finished feature A",
                    deltaPercentage: 10
                })
            };

            logProgress.mockResolvedValue({ success: true, timestamp: "2023-01-01T00:00:00.000Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toHaveProperty("success", true);
            expect(logProgress).toHaveBeenCalledWith("team-123", "Finished feature A", 10);
        });

        it("should return 400 if body is missing", async () => {
            const event = {};
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).error).toBe("Missing request body");
        });

        it("should return 400 for invalid JSON", async () => {
            const event = { body: "invalid-json" };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).error).toBe("Invalid JSON format");
        });

        it("should return 400 for missing teamId", async () => {
            const event = {
                body: JSON.stringify({
                    updateText: "test",
                    deltaPercentage: 5
                })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).error).toBe("teamId must be a non-empty string");
        });

        it("should return 400 for invalid deltaPercentage", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "t1",
                    updateText: "test",
                    deltaPercentage: 150
                })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).error).toBe("deltaPercentage must be a number between -100 and 100");
        });

        it("should return 500 on service failure", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "Finished feature A",
                    deltaPercentage: 10
                })
            };
            logProgress.mockRejectedValue(new Error("DynamoDB error"));

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).error).toBe("Internal Server Error");
        });
    });

    describe("getHistory", () => {
        it("should return 200 and logs for a valid teamId", async () => {
            const event = {
                pathParameters: { teamId: "team-123" }
            };
            const mockLogs = [{ update_text: "log 1" }];
            getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body).logs).toEqual(mockLogs);
            expect(getProgressLogs).toHaveBeenCalledWith("team-123");
        });

        it("should return 400 if teamId path parameter is missing", async () => {
            const event = { pathParameters: {} };
            const response = await getHistory(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).error).toBe("teamId path parameter is required");
        });

        it("should return 500 on service failure", async () => {
            const event = {
                pathParameters: { teamId: "team-123" }
            };
            getProgressLogs.mockRejectedValue(new Error("Query failed"));

            const response = await getHistory(event);
            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).error).toBe("Internal Server Error");
        });
    });
});
