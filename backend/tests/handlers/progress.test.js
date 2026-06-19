const { logUpdate, getHistory } = require("../../handlers/progress");
const progressService = require("../../services/progressService");

jest.mock("../../services/progressService");

describe("Progress Handlers", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        it("should return 201 on successful progress log", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "Finished feature A",
                    deltaPercentage: 15
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: "2023-01-01T00:00:00Z" });

            const result = await logUpdate(event);

            expect(result.statusCode).toBe(201);
            expect(JSON.parse(result.body)).toEqual({ success: true, timestamp: "2023-01-01T00:00:00Z" });
            expect(progressService.logProgress).toHaveBeenCalledWith("team123", "Finished feature A", 15);
        });

        it("should return 400 if required fields are missing", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123"
                })
            };

            const result = await logUpdate(event);

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).message).toContain("Missing required fields");
        });

        it("should return 400 if deltaPercentage is invalid", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "test",
                    deltaPercentage: 150
                })
            };

            const result = await logUpdate(event);

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).message).toContain("deltaPercentage must be a number between -100 and 100");
        });

        it("should return 400 for malformed JSON", async () => {
            const event = {
                body: "{ invalid json }"
            };

            const result = await logUpdate(event);

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).message).toBe("Invalid JSON in request body");
        });
    });

    describe("getHistory", () => {
        it("should return 200 and logs for a valid teamId", async () => {
            const event = {
                pathParameters: { teamId: "team123" }
            };

            const mockLogs = [
                { PK: "PROJ#team123", SK: "LOG#1", update_text: "Log 1" }
            ];
            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const result = await getHistory(event);

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith("team123");
        });

        it("should return 400 if teamId is missing", async () => {
            const event = {
                pathParameters: {}
            };

            const result = await getHistory(event);

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).message).toBe("Missing teamId path parameter");
        });
    });
});
