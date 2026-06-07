const { logUpdate, getHistory } = require("../../handlers/progress");
const progressService = require("../../services/progressService");

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
                    updateText: "Finished MVP",
                    deltaPercentage: 50
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: "2023-01-01T00:00:00Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: "2023-01-01T00:00:00Z" });
            expect(progressService.logProgress).toHaveBeenCalledWith("team-123", "Finished MVP", 50);
        });

        it("should return 400 if fields are missing", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123"
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("Missing required fields");
        });

        it("should return 400 for invalid JSON", async () => {
            const event = {
                body: "{ invalid json"
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("Invalid JSON in request body");
        });

        it("should return 400 if deltaPercentage is not a valid number", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "Progress",
                    deltaPercentage: "not-a-number"
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("deltaPercentage must be a numeric value between 0 and 100");
        });

        it("should return 400 if deltaPercentage is out of range", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "Progress",
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("deltaPercentage must be a numeric value between 0 and 100");
        });
    });

    describe("getHistory", () => {
        it("should return 200 and history logs", async () => {
            const event = {
                pathParameters: { teamId: "team-123" }
            };

            const mockLogs = [{ update_text: "Log 1", delta_percentage: 10 }];
            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith("team-123");
        });

        it("should return 400 if teamId is missing", async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("Missing teamId in path");
        });
    });
});
