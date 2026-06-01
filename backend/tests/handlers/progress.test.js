const { logUpdate, getHistory } = require("../../handlers/progress");
const progressService = require("../../services/progressService");

jest.mock("../../services/progressService");

describe("Progress Lambda Handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        it("should return 201 on successful log with string body", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "Started phase 1",
                    deltaPercentage: 10
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: "2023-01-01T00:00:00.000Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toHaveProperty("success", true);
            expect(progressService.logProgress).toHaveBeenCalledWith("team-123", "Started phase 1", 10);
        });

        it("should return 201 on successful log with object body", async () => {
            const event = {
                body: {
                    teamId: "team-456",
                    updateText: "Phase 2 update",
                    deltaPercentage: "15.5"
                }
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: "2023-01-01T01:00:00.000Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(progressService.logProgress).toHaveBeenCalledWith("team-456", "Phase 2 update", 15.5);
        });

        it("should return 400 for missing fields", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123"
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("Missing required fields");
        });

        it("should return 400 for invalid deltaPercentage (out of range)", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "test",
                    deltaPercentage: 101
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("deltaPercentage must be a number between 0 and 100");
        });

        it("should return 400 for invalid deltaPercentage (not a number)", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "test",
                    deltaPercentage: "invalid"
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("deltaPercentage must be a number between 0 and 100");
        });

        it("should return 400 for malformed JSON string", async () => {
            const event = {
                body: "{ invalid json }"
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("Invalid JSON in request body");
        });

        it("should return 500 when service layer fails", async () => {
            const event = {
                body: {
                    teamId: "team-error",
                    updateText: "test",
                    deltaPercentage: 5
                }
            };

            progressService.logProgress.mockRejectedValue(new Error("DynamoDB Failure"));

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal Server Error");
        });
    });

    describe("getHistory", () => {
        it("should return 200 and logs for a valid teamId", async () => {
            const event = {
                pathParameters: { teamId: "team-123" }
            };

            const mockLogs = [{ PK: "PROJ#team-123", update_text: "test" }];
            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith("team-123");
        });

        it("should return 400 if teamId is missing", async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("Missing teamId path parameter");
        });

        it("should return 500 when service layer fails", async () => {
            const event = {
                pathParameters: { teamId: "team-fail" }
            };

            progressService.getProgressLogs.mockRejectedValue(new Error("Query Error"));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal Server Error");
        });
    });
});
