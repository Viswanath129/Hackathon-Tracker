const progressService = require("../../services/progressService");
const { logUpdate, getHistory } = require("../../handlers/progress");

jest.mock("../../services/progressService");

describe("Progress Lambda Handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        test("should successfully log progress update with string body", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "Finished UI",
                    deltaPercentage: 15
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: "2023-01-01T00:00:00Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: "2023-01-01T00:00:00Z" });
            expect(progressService.logProgress).toHaveBeenCalledWith("team123", "Finished UI", 15);
        });

        test("should successfully log progress update with object body", async () => {
            const event = {
                body: {
                    teamId: "team123",
                    updateText: "Finished UI",
                    deltaPercentage: 15
                }
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: "2023-01-01T00:00:00Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(progressService.logProgress).toHaveBeenCalledWith("team123", "Finished UI", 15);
        });

        test("should return 400 if missing required fields", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123"
                    // missing updateText
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("Missing required fields");
        });

        test("should return 400 if deltaPercentage is invalid", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "text",
                    deltaPercentage: 150 // Invalid
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("deltaPercentage must be a numeric value");
        });

        test("should return 500 if service throws error", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "text"
                })
            };

            progressService.logProgress.mockRejectedValue(new Error("DB Error"));

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal Server Error");
        });
    });

    describe("getHistory", () => {
        test("should successfully retrieve history", async () => {
            const event = {
                pathParameters: {
                    teamId: "team123"
                }
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
            expect(JSON.parse(response.body).message).toContain("Missing teamId");
        });

        test("should return 500 if service throws error", async () => {
            const event = {
                pathParameters: {
                    teamId: "team123"
                }
            };

            progressService.getProgressLogs.mockRejectedValue(new Error("DB Error"));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal Server Error");
        });
    });
});
