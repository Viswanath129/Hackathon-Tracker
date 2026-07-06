const { logUpdate, getHistory } = require("../../handlers/progress");
const progressService = require("../../services/progressService");

// Mock the progress service
jest.mock("../../services/progressService");

describe("Progress Lambda Handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        test("should return 201 on successful log", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "Finished API integration",
                    deltaPercentage: 15
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body).message).toBe("Progress logged successfully");
            expect(progressService.logProgress).toHaveBeenCalledWith("team-123", "Finished API integration", 15);
        });

        test("should return 400 if body is missing", async () => {
            const event = {};
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("Request body is missing");
        });

        test("should return 400 if validation fails", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "",
                    updateText: "Valid text",
                    deltaPercentage: 50
                })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("teamId is required");
        });

        test("should handle invalid deltaPercentage", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "Valid text",
                    deltaPercentage: 150
                })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("deltaPercentage must be a number between -100 and 100");
        });
    });

    describe("getHistory", () => {
        test("should return 200 and history logs", async () => {
            const mockLogs = [
                { PK: "PROJ#team-123", SK: "LOG#1", update_text: "Log 1" },
                { PK: "PROJ#team-123", SK: "LOG#2", update_text: "Log 2" }
            ];
            const event = {
                pathParameters: { teamId: "team-123" }
            };

            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith("team-123");
        });

        test("should return 400 if teamId is missing", async () => {
            const event = { pathParameters: {} };
            const response = await getHistory(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("teamId path parameter is required");
        });
    });
});
