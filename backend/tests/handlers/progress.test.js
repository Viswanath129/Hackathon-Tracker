const { logUpdate, getHistory } = require("../../handlers/progress");
const progressService = require("../../services/progressService");

jest.mock("../../services/progressService");

describe("Progress Handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        test("should return 201 on successful progress log", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "Worked on UI",
                    deltaPercentage: 15.5
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: "2023-01-01T00:00:00Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: "2023-01-01T00:00:00Z" });
            expect(progressService.logProgress).toHaveBeenCalledWith("team123", "Worked on UI", 15.5);
        });

        test("should handle pre-parsed body object", async () => {
            const event = {
                body: {
                    teamId: "team123",
                    updateText: "Worked on UI",
                    deltaPercentage: "15.5"
                }
            };

            progressService.logProgress.mockResolvedValue({ success: true });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(progressService.logProgress).toHaveBeenCalledWith("team123", "Worked on UI", 15.5);
        });

        test("should return 400 for malformed JSON", async () => {
            const event = {
                body: '{"teamId": "team123", "updateText": "incomplete'
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("Invalid JSON format");
        });

        test("should return 400 for missing fields", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123"
                    // updateText and deltaPercentage missing
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("Missing required fields");
        });

        test("should return 400 for invalid deltaPercentage", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "test",
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("deltaPercentage must be a number between 0 and 100");
        });

        test("should return 500 when service fails", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "test",
                    deltaPercentage: 10
                })
            };

            progressService.logProgress.mockRejectedValue(new Error("DB Error"));

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal Server Error");
        });
    });

    describe("getHistory", () => {
        test("should return 200 and logs for a valid teamId", async () => {
            const event = {
                pathParameters: { teamId: "team123" }
            };

            const mockLogs = [
                { PK: "PROJ#team123", SK: "LOG#1", update_text: "Log 1" },
                { PK: "PROJ#team123", SK: "LOG#2", update_text: "Log 2" }
            ];

            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith("team123");
        });

        test("should return 400 if teamId is missing", async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("teamId is required");
        });

        test("should return 500 when service fails", async () => {
            const event = {
                pathParameters: { teamId: "team123" }
            };

            progressService.getProgressLogs.mockRejectedValue(new Error("DB Error"));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal Server Error");
        });
    });
});
