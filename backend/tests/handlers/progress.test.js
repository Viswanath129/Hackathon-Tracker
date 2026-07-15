const { logUpdate, getHistory } = require("../../handlers/progress");
const progressService = require("../../services/progressService");

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
                    updateText: "Finished feature A",
                    deltaPercentage: 10
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: "2023-10-27T10:00:00Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);
            expect(body.message).toBe("Progress logged successfully");
            expect(body.success).toBe(true);
            expect(progressService.logProgress).toHaveBeenCalledWith("team123", "Finished feature A", 10);
        });

        it("should return 400 when body is missing", async () => {
            const event = {};
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("Request body is missing");
        });

        it("should return 400 when teamId is invalid", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "",
                    updateText: "test",
                    deltaPercentage: 10
                })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("teamId must be a non-empty string");
        });

        it("should return 400 when deltaPercentage is out of range", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "test",
                    deltaPercentage: 150
                })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("deltaPercentage must be a numeric value between -100 and 100");
        });

        it("should return 500 when service throws error", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "test",
                    deltaPercentage: 10
                })
            };
            progressService.logProgress.mockRejectedValue(new Error("DynamoDB error"));
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal Server Error");
        });
    });

    describe("getHistory", () => {
        it("should return 200 and logs when teamId is provided", async () => {
            const event = {
                pathParameters: { teamId: "team123" }
            };
            const mockLogs = [{ SK: "LOG#1", update_text: "Update 1" }];
            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(progressService.getProgressLogs).toHaveBeenCalledWith("team123");
        });

        it("should return 400 when teamId is missing", async () => {
            const event = { pathParameters: {} };
            const response = await getHistory(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("teamId path parameter is required");
        });
    });
});
