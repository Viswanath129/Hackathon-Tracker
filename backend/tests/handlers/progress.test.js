const progressService = require("../../services/progressService");
const { logUpdate, getHistory } = require("../../handlers/progress");

jest.mock("../../services/progressService");

describe("Progress Lambda Handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        it("should log progress successfully with 201 status", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "TEAM123",
                    updateText: "Finished API implementation",
                    deltaPercentage: 15
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: "2023-01-01" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: "2023-01-01" });
            expect(progressService.logProgress).toHaveBeenCalledWith("TEAM123", "Finished API implementation", 15);
        });

        it("should return 400 if teamId is missing", async () => {
            const event = {
                body: JSON.stringify({
                    updateText: "Missing teamId",
                    deltaPercentage: 10
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("teamId and updateText are required");
        });

        it("should return 400 if deltaPercentage is invalid", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "TEAM123",
                    updateText: "Invalid delta",
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("deltaPercentage must be a number between 0 and 100");
        });

        it("should handle pre-parsed body (direct invocation)", async () => {
            const event = {
                body: {
                    teamId: "TEAM123",
                    updateText: "Pre-parsed body",
                    deltaPercentage: 5
                }
            };

            progressService.logProgress.mockResolvedValue({ success: true });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
        });
    });

    describe("getHistory", () => {
        it("should fetch progress logs successfully", async () => {
            const event = {
                pathParameters: { teamId: "TEAM123" }
            };

            const mockLogs = [
                { PK: "PROJ#TEAM123", SK: "LOG#1", update_text: "Log 1" },
                { PK: "PROJ#TEAM123", SK: "LOG#2", update_text: "Log 2" }
            ];

            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith("TEAM123");
        });

        it("should return 400 if teamId is missing in path", async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("teamId path parameter is required");
        });

        it("should return 500 if service fails", async () => {
            const event = {
                pathParameters: { teamId: "TEAM123" }
            };

            progressService.getProgressLogs.mockRejectedValue(new Error("DB failure"));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal Server Error");
        });
    });
});
