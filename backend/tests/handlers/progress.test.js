const { logUpdate, getHistory } = require("../../handlers/progress");
const { logProgress, getProgressLogs } = require("../../services/progressService");

jest.mock("../../services/progressService");

describe("Progress Handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        it("should return 201 on successful progress log", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "Finished initial prototype",
                    deltaPercentage: 25
                })
            };

            logProgress.mockResolvedValue({ success: true, timestamp: "2025-01-01T00:00:00Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: "2025-01-01T00:00:00Z" });
            expect(logProgress).toHaveBeenCalledWith("team-123", "Finished initial prototype", 25);
        });

        it("should return 400 if teamId is missing", async () => {
            const event = {
                body: JSON.stringify({
                    updateText: "No teamId here",
                    deltaPercentage: 10
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("teamId must be a non-empty string");
        });

        it("should return 400 if updateText is empty", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "",
                    deltaPercentage: 10
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("updateText must be a non-empty string");
        });

        it("should return 400 if deltaPercentage is invalid", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "Some update",
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("deltaPercentage must be a number between -100 and 100");
        });

        it("should return 500 if logProgress throws an error", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "Error test",
                    deltaPercentage: 5
                })
            };

            logProgress.mockRejectedValue(new Error("DB Error"));

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal server error");
        });
    });

    describe("getHistory", () => {
        it("should return 200 and logs on success", async () => {
            const event = {
                pathParameters: { teamId: "team-123" }
            };

            const mockLogs = [
                { PK: "PROJ#team-123", SK: "LOG#1", update_text: "Update 1", delta_percentage: 10 },
                { PK: "PROJ#team-123", SK: "LOG#2", update_text: "Update 2", delta_percentage: 20 }
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
            expect(JSON.parse(response.body).message).toBe("teamId path parameter is required");
        });

        it("should return 500 if getProgressLogs throws an error", async () => {
            const event = {
                pathParameters: { teamId: "team-123" }
            };

            getProgressLogs.mockRejectedValue(new Error("DB Error"));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal server error");
        });
    });
});
