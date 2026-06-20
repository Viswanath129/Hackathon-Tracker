const { logUpdate, getHistory } = require("../../handlers/progress");
const progressService = require("../../services/progressService");

jest.mock("../../services/progressService");

describe("Progress Handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        it("should return 201 when progress is successfully logged", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "Finished API implementation",
                    deltaPercentage: 15.5
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: "2023-10-01T12:00:00Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toMatchObject({
                message: "Progress logged successfully",
                success: true
            });
            expect(progressService.logProgress).toHaveBeenCalledWith("team-123", "Finished API implementation", 15.5);
        });

        it("should return 400 when body is invalid JSON", async () => {
            const event = {
                body: "invalid-json"
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("Invalid JSON");
        });

        it("should return 400 when required fields are missing", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123"
                    // missing updateText and deltaPercentage
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("Missing required fields");
        });

        it("should return 400 when deltaPercentage is out of range", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "Testing",
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("deltaPercentage must be a number between -100 and 100");
        });
    });

    describe("getHistory", () => {
        it("should return 200 and logs for a valid teamId", async () => {
            const event = {
                pathParameters: {
                    teamId: "team-123"
                }
            };

            const mockLogs = [
                { PK: "PROJ#team-123", SK: "LOG#1", update_text: "Update 1", delta_percentage: 10 },
                { PK: "PROJ#team-123", SK: "LOG#2", update_text: "Update 2", delta_percentage: 5 }
            ];

            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith("team-123");
        });

        it("should return 400 when teamId is missing in path", async () => {
            const event = {
                pathParameters: null
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("Missing teamId");
        });
    });
});
