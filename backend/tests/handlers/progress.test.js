// Mock service modules FIRST before requiring handlers/services
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock("../../services/progressService", () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

const { logUpdate, getHistory } = require("../../handlers/progress");

describe("Progress Lambda Handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        it("should log progress successfully and return 201", async () => {
            mockLogProgress.mockResolvedValue({ success: true, timestamp: "2026-07-23T12:00:00.000Z" });

            const event = {
                body: JSON.stringify({
                    teamId: "team-abc",
                    updateText: "Working on core features",
                    deltaPercentage: 25
                })
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: "2026-07-23T12:00:00.000Z" });
            expect(mockLogProgress).toHaveBeenCalledWith("team-abc", "Working on core features", 25);
        });

        it("should return 400 if request body is missing", async () => {
            const event = {};
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).error).toBe("Request body is missing");
        });

        it("should return 400 if JSON parsing fails", async () => {
            const event = {
                body: "invalid-json{"
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).error).toBe("Invalid JSON format");
        });

        it("should return 400 on input validation failure", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "",
                    updateText: "Valid text",
                    deltaPercentage: 50
                })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).error).toContain("teamId");
        });

        it("should return 400 if deltaPercentage is a boolean", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-1",
                    updateText: "Valid text",
                    deltaPercentage: true
                })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).error).toContain("deltaPercentage");
        });

        it("should return 400 if deltaPercentage is out of bounds", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-1",
                    updateText: "Valid text",
                    deltaPercentage: 150
                })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).error).toContain("deltaPercentage");
        });

        it("should return 500 on internal service failure", async () => {
            mockLogProgress.mockRejectedValue(new Error("DB error"));
            const event = {
                body: JSON.stringify({
                    teamId: "team-1",
                    updateText: "Valid text",
                    deltaPercentage: 50
                })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).error).toBe("Internal Server Error");
        });
    });

    describe("getHistory", () => {
        it("should retrieve progress logs and return 200", async () => {
            const mockLogs = [
                { PK: "PROJ#team-1", SK: "LOG#1", update_text: "Log 1", delta_percentage: 10 }
            ];
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            const event = {
                pathParameters: { teamId: "team-1" }
            };

            const response = await getHistory(event);
            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(mockGetProgressLogs).toHaveBeenCalledWith("team-1");
        });

        it("should return 400 if teamId path parameter is missing", async () => {
            const event = {
                pathParameters: {}
            };
            const response = await getHistory(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).error).toBe("teamId parameter is required");
        });

        it("should return 500 on internal service error", async () => {
            mockGetProgressLogs.mockRejectedValue(new Error("DB query error"));
            const event = {
                pathParameters: { teamId: "team-1" }
            };
            const response = await getHistory(event);
            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).error).toBe("Internal Server Error");
        });
    });
});
