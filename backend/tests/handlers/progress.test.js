const { logUpdate, getHistory } = require("../../handlers/progress");
const { logProgress, getProgressLogs } = require("../../services/progressService");

jest.mock("../../services/progressService");

describe("Progress Lambda Handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate handler", () => {
        it("should return 201 on successful progress log", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "Added unit tests",
                    deltaPercentage: 15.5
                })
            };

            logProgress.mockResolvedValue({ success: true, timestamp: "2023-01-01T00:00:00Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: "2023-01-01T00:00:00Z" });
            expect(logProgress).toHaveBeenCalledWith("team123", "Added unit tests", 15.5);
        });

        it("should handle pre-parsed body", async () => {
            const event = {
                body: {
                    teamId: "team123",
                    updateText: "Added unit tests",
                    deltaPercentage: 15.5
                }
            };

            logProgress.mockResolvedValue({ success: true });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
        });

        it("should return 400 if body is missing", async () => {
            const event = { body: null };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("Invalid request body");
        });

        it("should return 400 if required fields are missing", async () => {
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

        it("should return 400 if deltaPercentage is invalid", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "test",
                    deltaPercentage: 150 // Out of range
                })
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("deltaPercentage must be a numeric value between 0 and 100");
        });

        it("should return 400 on malformed JSON", async () => {
            const event = {
                body: "{ invalid json }"
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("Malformed JSON in request body");
        });

        it("should return 500 on service error", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "test",
                    deltaPercentage: 10
                })
            };

            logProgress.mockRejectedValue(new Error("DB Error"));

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal Server Error");
        });
    });

    describe("getHistory handler", () => {
        it("should return 200 and logs for a valid teamId", async () => {
            const event = {
                pathParameters: { teamId: "team123" }
            };

            const mockLogs = [{ update_text: "Log 1", delta_percentage: 10 }];
            getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(getProgressLogs).toHaveBeenCalledWith("team123");
        });

        it("should return 400 if teamId is missing", async () => {
            const event = { pathParameters: {} };
            const response = await getHistory(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("teamId is required in path parameters");
        });

        it("should return 500 on service error", async () => {
            const event = {
                pathParameters: { teamId: "team123" }
            };

            getProgressLogs.mockRejectedValue(new Error("DB Error"));

            const response = await getHistory(event);
            expect(response.statusCode).toBe(500);
        });
    });
});
