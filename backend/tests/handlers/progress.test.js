const { logUpdate, getHistory } = require("../../handlers/progress");
const progressService = require("../../services/progressService");

jest.mock("../../services/progressService");

describe("Progress Handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        it("should return 201 when progress is logged successfully", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "Finished UI",
                    deltaPercentage: 25
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: "2023-10-27T10:00:00Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: "2023-10-27T10:00:00Z" });
            expect(progressService.logProgress).toHaveBeenCalledWith("team123", "Finished UI", 25);
        });

        it("should return 400 when body is invalid JSON", async () => {
            const event = { body: "invalid json" };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("Invalid JSON in request body");
        });

        it("should return 400 when required fields are missing", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123"
                    // missing updateText and deltaPercentage
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("Missing required fields");
        });

        it("should return 400 when deltaPercentage is out of range", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "Update",
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("deltaPercentage must be a number between 0 and 100");
        });

        it("should return 500 when service layer throws an error", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "Update",
                    deltaPercentage: 10
                })
            };

            progressService.logProgress.mockRejectedValue(new Error("Database error"));

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal server error");
        });
    });

    describe("getHistory", () => {
        it("should return 200 and logs when teamId is provided", async () => {
            const mockLogs = [
                { PK: "PROJ#team123", SK: "LOG#1", update_text: "Log 1", delta_percentage: 10 }
            ];
            const event = {
                pathParameters: { teamId: "team123" }
            };

            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith("team123");
        });

        it("should return 400 when teamId is missing in path parameters", async () => {
            const event = { pathParameters: {} };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("teamId is required in path parameters");
        });

        it("should return 500 when service layer throws an error", async () => {
            const event = {
                pathParameters: { teamId: "team123" }
            };

            progressService.getProgressLogs.mockRejectedValue(new Error("Database error"));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal server error");
        });
    });
});
