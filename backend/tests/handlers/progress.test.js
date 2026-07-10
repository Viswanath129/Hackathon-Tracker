const { logUpdate, getHistory } = require("../../handlers/progress");
const { logProgress, getProgressLogs } = require("../../services/progressService");

jest.mock("../../services/progressService");

describe("Progress Lambda Handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        it("should return 201 when progress is logged successfully", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "Finished API integration",
                    deltaPercentage: 10
                })
            };

            logProgress.mockResolvedValue({ success: true, timestamp: "2023-10-27T10:00:00Z" });

            const result = await logUpdate(event);

            expect(result.statusCode).toBe(201);
            expect(JSON.parse(result.body)).toHaveProperty("success", true);
            expect(logProgress).toHaveBeenCalledWith("team123", "Finished API integration", 10);
        });

        it("should return 400 when teamId is missing or empty", async () => {
            const event = {
                body: JSON.stringify({
                    updateText: "Finished API integration",
                    deltaPercentage: 10
                })
            };

            const result = await logUpdate(event);

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).message).toBe("teamId must be a non-empty string");
        });

        it("should return 400 when deltaPercentage is out of range", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "Update",
                    deltaPercentage: 150
                })
            };

            const result = await logUpdate(event);

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).message).toBe("deltaPercentage must be a numeric value between -100 and 100");
        });

        it("should return 400 when body is invalid JSON", async () => {
            const event = {
                body: "invalid-json"
            };

            const result = await logUpdate(event);

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).message).toBe("Invalid JSON body");
        });
    });

    describe("getHistory", () => {
        it("should return 200 and logs when teamId is provided", async () => {
            const event = {
                pathParameters: { teamId: "team123" }
            };

            const mockLogs = [
                { PK: "PROJ#team123", SK: "LOG#1", update_text: "Update 1" }
            ];
            getProgressLogs.mockResolvedValue(mockLogs);

            const result = await getHistory(event);

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body)).toEqual(mockLogs);
            expect(getProgressLogs).toHaveBeenCalledWith("team123");
        });

        it("should return 400 when teamId is missing in path", async () => {
            const event = {
                pathParameters: {}
            };

            const result = await getHistory(event);

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).message).toBe("Missing teamId in path");
        });
    });
});
