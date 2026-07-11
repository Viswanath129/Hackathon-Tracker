const { logProgress, getProgressLogs } = require("../../services/progressService");

jest.mock("../../services/progressService");

const { logUpdate, getHistory } = require("../../handlers/progress");

describe("Progress Lambda Handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        test("should return 201 on successful log", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "Finished MVP",
                    deltaPercentage: 20
                })
            };

            logProgress.mockResolvedValue({ success: true, timestamp: "2023-10-27T10:00:00Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toHaveProperty("success", true);
            expect(logProgress).toHaveBeenCalledWith("team123", "Finished MVP", 20);
        });

        test("should return 400 for missing teamId", async () => {
            const event = {
                body: JSON.stringify({
                    updateText: "Finished MVP",
                    deltaPercentage: 20
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("teamId");
        });

        test("should return 400 for invalid deltaPercentage", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "Finished MVP",
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("deltaPercentage");
        });

        test("should return 400 for invalid JSON", async () => {
            const event = {
                body: "{ invalid json }"
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("JSON");
        });
    });

    describe("getHistory", () => {
        test("should return 200 and logs for a valid teamId", async () => {
            const event = {
                pathParameters: { teamId: "team123" }
            };

            const mockLogs = [
                { PK: "PROJ#team123", SK: "LOG#1", update_text: "Test 1" },
                { PK: "PROJ#team123", SK: "LOG#2", update_text: "Test 2" }
            ];

            getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(getProgressLogs).toHaveBeenCalledWith("team123");
        });

        test("should return 400 if teamId is missing", async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("teamId");
        });

        test("should return 500 on service error", async () => {
            const event = {
                pathParameters: { teamId: "team123" }
            };

            getProgressLogs.mockRejectedValue(new Error("DynamoDB fail"));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal Server Error");
        });
    });
});
