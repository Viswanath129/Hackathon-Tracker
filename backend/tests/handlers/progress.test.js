const { logUpdate, getHistory } = require("../../handlers/progress");
const { logProgress, getProgressLogs } = require("../../services/progressService");

jest.mock("../../services/progressService");

describe("Progress Lambda Handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        it("should log progress successfully with a 201 status", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "Finished UI components",
                    deltaPercentage: 15
                })
            };

            logProgress.mockResolvedValue({ success: true, timestamp: "2023-10-27T10:00:00Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: "2023-10-27T10:00:00Z" });
            expect(logProgress).toHaveBeenCalledWith("team-123", "Finished UI components", 15);
        });

        it("should return 400 if teamId is missing", async () => {
            const event = {
                body: JSON.stringify({
                    updateText: "Finished UI components",
                    deltaPercentage: 15
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("teamId");
        });

        it("should return 400 if updateText is empty", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: " ",
                    deltaPercentage: 15
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("updateText");
        });

        it("should return 400 if deltaPercentage is invalid", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "Valid update",
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("deltaPercentage");
        });

        it("should return 400 if body is invalid JSON", async () => {
            const event = {
                body: "{ invalid json }"
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("Invalid JSON");
        });
    });

    describe("getHistory", () => {
        it("should return progress history with a 200 status", async () => {
            const event = {
                pathParameters: {
                    teamId: "team-123"
                }
            };

            const mockLogs = [
                { PK: "PROJ#team-123", SK: "LOG#1", update_text: "Log 1", delta_percentage: 10 },
                { PK: "PROJ#team-123", SK: "LOG#2", update_text: "Log 2", delta_percentage: 20 }
            ];

            getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(getProgressLogs).toHaveBeenCalledWith("team-123");
        });

        it("should return 400 if teamId is missing in path parameters", async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("teamId");
        });

        it("should return 500 if service throws an error", async () => {
            const event = {
                pathParameters: {
                    teamId: "team-123"
                }
            };

            getProgressLogs.mockRejectedValue(new Error("DynamoDB fail"));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal server error");
        });
    });
});
