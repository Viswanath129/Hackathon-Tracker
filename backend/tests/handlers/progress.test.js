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
                    teamId: "team-123",
                    updateText: "Working on authentication",
                    deltaPercentage: 10
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: "2023-01-01" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: "2023-01-01" });
            expect(progressService.logProgress).toHaveBeenCalledWith("team-123", "Working on authentication", 10);
        });

        it("should return 400 if teamId is missing", async () => {
            const event = {
                body: JSON.stringify({
                    updateText: "Working on authentication",
                    deltaPercentage: 10
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("teamId");
        });

        it("should return 400 if updateText is missing", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    deltaPercentage: 10
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
                    updateText: "test",
                    deltaPercentage: "not-a-number"
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("deltaPercentage");
        });

        it("should return 400 if deltaPercentage is out of range", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "test",
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("deltaPercentage");
        });

        it("should handle invalid JSON", async () => {
            const event = {
                body: "invalid-json"
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("Invalid JSON");
        });
    });

    describe("getHistory", () => {
        it("should return 200 and logs for a valid teamId", async () => {
            const event = {
                pathParameters: {
                    teamId: "team-123"
                }
            };

            const mockLogs = [
                { PK: "PROJ#team-123", SK: "LOG#1", update_text: "Init" }
            ];
            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith("team-123");
        });

        it("should return 400 if teamId is missing in path parameters", async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("teamId");
        });
    });
});
