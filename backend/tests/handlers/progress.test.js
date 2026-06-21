const { logUpdate, getHistory } = require("../../handlers/progress");
const { logProgress, getProgressLogs } = require("../../services/progressService");

jest.mock("../../services/progressService");

describe("Progress Handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        it("should return 201 on successful progress update", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "Milestone reached",
                    deltaPercentage: 10
                })
            };

            logProgress.mockResolvedValue({ success: true, timestamp: "2023-01-01T00:00:00.000Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({
                message: "Progress logged successfully",
                timestamp: "2023-01-01T00:00:00.000Z"
            });
            expect(logProgress).toHaveBeenCalledWith("team-123", "Milestone reached", 10);
        });

        it("should return 400 for invalid JSON", async () => {
            const event = {
                body: "invalid-json"
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("Invalid JSON");
        });

        it("should return 400 for missing fields", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123"
                    // missing updateText and deltaPercentage
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("Missing required fields");
        });

        it("should return 400 for invalid deltaPercentage", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "Milestone reached",
                    deltaPercentage: 150 // Out of range
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("deltaPercentage must be a number between -100 and 100");
        });

        it("should return 500 when service fails", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "Milestone reached",
                    deltaPercentage: 10
                })
            };

            logProgress.mockRejectedValue(new Error("DynamoDB failure"));

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal server error");
        });
    });

    describe("getHistory", () => {
        it("should return 200 and logs for a valid teamId", async () => {
            const event = {
                pathParameters: { teamId: "team-123" }
            };

            const mockLogs = [
                { PK: "PROJ#team-123", SK: "LOG#1", update_text: "Start", delta_percentage: 0 },
                { PK: "PROJ#team-123", SK: "LOG#2", update_text: "Update", delta_percentage: 10 }
            ];

            getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(getProgressLogs).toHaveBeenCalledWith("team-123");
        });

        it("should return 400 if teamId is missing", async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("Missing teamId parameter");
        });

        it("should return 500 when service fails", async () => {
            const event = {
                pathParameters: { teamId: "team-123" }
            };

            getProgressLogs.mockRejectedValue(new Error("DynamoDB failure"));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal server error");
        });
    });
});
