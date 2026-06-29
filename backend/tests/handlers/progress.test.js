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

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: "2023-10-27T10:00:00Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: "2023-10-27T10:00:00Z" });
            expect(progressService.logProgress).toHaveBeenCalledWith("team-123", "Finished API integration", 15);
        });

        test("should return 400 if body is missing", async () => {
            const event = {};
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("missing");
        });

        test("should return 400 if teamId is invalid", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "",
                    updateText: "Valid text",
                    deltaPercentage: 10
                })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("teamId");
        });

        test("should return 400 if deltaPercentage is out of range", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "Valid text",
                    deltaPercentage: 150
                })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("deltaPercentage");
        });

        test("should return 500 if service throws error", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "Valid text",
                    deltaPercentage: 10
                })
            };
            progressService.logProgress.mockRejectedValue(new Error("DB Error"));
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(500);
        });
    });

    describe("getHistory", () => {
        test("should return 200 and logs for a valid teamId", async () => {
            const event = {
                pathParameters: { teamId: "team-123" }
            };
            const mockLogs = [{ PK: "PROJ#team-123", SK: "LOG#1", update_text: "Update 1" }];
            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith("team-123");
        });

        test("should return 400 if teamId is missing in pathParameters", async () => {
            const event = { pathParameters: {} };
            const response = await getHistory(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("teamId");
        });
    });
});
