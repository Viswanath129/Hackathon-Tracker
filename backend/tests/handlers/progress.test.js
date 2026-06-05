const progressService = require("../../services/progressService");
const { logUpdate, getHistory } = require("../../handlers/progress");
const { formatResponse } = require("../../handlers/utils");

jest.mock("../../services/progressService");
jest.mock("../../handlers/utils");

describe("Progress Handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Default implementation for formatResponse to help verification
        formatResponse.mockImplementation((statusCode, body) => ({
            statusCode,
            body: JSON.stringify(body)
        }));
    });

    describe("logUpdate", () => {
        test("should return 201 on successful progress log", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "Finished API integration",
                    deltaPercentage: 25
                })
            };
            const mockResult = { success: true, timestamp: "2023-10-27T10:00:00Z" };
            progressService.logProgress.mockResolvedValue(mockResult);

            const response = await logUpdate(event);

            expect(progressService.logProgress).toHaveBeenCalledWith("team123", "Finished API integration", 25);
            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual(mockResult);
        });

        test("should handle pre-parsed object body", async () => {
            const event = {
                body: {
                    teamId: "team123",
                    updateText: "Finished API integration",
                    deltaPercentage: 25
                }
            };
            progressService.logProgress.mockResolvedValue({ success: true });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
        });

        test("should return 400 for missing required fields", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123"
                    // missing updateText
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("required");
        });

        test("should return 400 for invalid deltaPercentage", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "text",
                    deltaPercentage: 150 // invalid
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("deltaPercentage");
        });

        test("should return 400 for malformed JSON", async () => {
            const event = {
                body: "{ invalid json }"
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("Invalid JSON");
        });

        test("should return 500 on service failure", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team123",
                    updateText: "text",
                    deltaPercentage: 10
                })
            };
            progressService.logProgress.mockRejectedValue(new Error("Dynamo error"));

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal Server Error");
        });
    });

    describe("getHistory", () => {
        test("should return 200 and logs on success", async () => {
            const event = {
                pathParameters: { teamId: "team123" }
            };
            const mockLogs = [{ update_text: "Log 1" }, { update_text: "Log 2" }];
            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(progressService.getProgressLogs).toHaveBeenCalledWith("team123");
            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
        });

        test("should return 400 if teamId is missing", async () => {
            const event = { pathParameters: {} };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
        });

        test("should return 500 on service failure", async () => {
            const event = {
                pathParameters: { teamId: "team123" }
            };
            progressService.getProgressLogs.mockRejectedValue(new Error("Dynamo error"));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
        });
    });
});
