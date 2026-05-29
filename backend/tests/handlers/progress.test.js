const { logUpdate, getHistory } = require("../../handlers/progress");
const { logProgress, getProgressLogs } = require("../../services/progressService");

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
                    updateText: "Finished feature A",
                    deltaPercentage: 10
                })
            };
            logProgress.mockResolvedValue({ success: true, timestamp: "2023-01-01T00:00:00Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: "2023-01-01T00:00:00Z" });
            expect(logProgress).toHaveBeenCalledWith("team123", "Finished feature A", 10);
        });

        test("should handle pre-parsed body object", async () => {
            const event = {
                body: {
                    teamId: "team123",
                    updateText: "Finished feature A",
                    deltaPercentage: 10
                }
            };
            logProgress.mockResolvedValue({ success: true });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(logProgress).toHaveBeenCalledWith("team123", "Finished feature A", 10);
        });

        test("should return 400 if teamId is missing", async () => {
            const event = {
                body: JSON.stringify({ updateText: "test" })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("Missing required field: teamId");
        });

        test("should return 400 if deltaPercentage is invalid", async () => {
            const event = {
                body: JSON.stringify({ teamId: "t1", deltaPercentage: 150 })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("deltaPercentage must be a numeric value between 0 and 100");
        });

        test("should return 400 for malformed JSON", async () => {
            const event = {
                body: "{ invalid json"
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("Invalid JSON in request body");
        });

        test("should return 500 on service error", async () => {
            const event = {
                body: JSON.stringify({ teamId: "t1" })
            };
            logProgress.mockRejectedValue(new Error("DB Error"));

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
            const mockLogs = [{ SK: "LOG#1", update_text: "test" }];
            getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(getProgressLogs).toHaveBeenCalledWith("team123");
        });

        test("should return 400 if teamId is missing", async () => {
            const event = { pathParameters: {} };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("Missing teamId");
        });

        test("should return 500 on service error", async () => {
            const event = { pathParameters: { teamId: "t1" } };
            getProgressLogs.mockRejectedValue(new Error("DB Error"));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal Server Error");
        });
    });
});
