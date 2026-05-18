const { logUpdate, getHistory } = require("../../handlers/progress");
const { logProgress, getProgressLogs } = require("../../services/progressService");

jest.mock("../../services/progressService");

describe("Progress Lambda Handlers", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        it("should return 201 on successful progress log", async () => {
            const event = {
                body: JSON.stringify({
                    projectId: "proj123",
                    updateText: "Finished UI implementation",
                    deltaPercentage: 10
                })
            };

            logProgress.mockResolvedValue({ success: true, timestamp: "2023-10-01T12:00:00Z" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body)).toEqual({ success: true, timestamp: "2023-10-01T12:00:00Z" });
            expect(logProgress).toHaveBeenCalledWith("proj123", "Finished UI implementation", 10);
        });

        it("should return 400 if projectId or updateText is missing", async () => {
            const event = {
                body: JSON.stringify({
                    projectId: "proj123"
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("projectId and updateText are required");
        });

        it("should return 400 if deltaPercentage is invalid", async () => {
            const event = {
                body: JSON.stringify({
                    projectId: "proj123",
                    updateText: "Test",
                    deltaPercentage: 150
                })
            };

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("deltaPercentage must be a number between 0 and 100");
        });

        it("should return 500 if logProgress throws an error", async () => {
            const event = {
                body: JSON.stringify({
                    projectId: "proj123",
                    updateText: "Error test"
                })
            };

            logProgress.mockRejectedValue(new Error("DynamoDB failed"));

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal Server Error");
        });
    });

    describe("getHistory", () => {
        it("should return 200 and logs on success", async () => {
            const event = {
                pathParameters: { teamId: "proj123" }
            };

            const mockLogs = [
                { PK: "PROJ#proj123", SK: "LOG#1", update_text: "Test 1" },
                { PK: "PROJ#proj123", SK: "LOG#2", update_text: "Test 2" }
            ];

            getProgressLogs.mockResolvedValue(mockLogs);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(getProgressLogs).toHaveBeenCalledWith("proj123");
        });

        it("should return 400 if teamId (projectId) is missing", async () => {
            const event = {
                pathParameters: {}
            };

            const response = await getHistory(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe("projectId (teamId) is required");
        });

        it("should return 500 if getProgressLogs throws an error", async () => {
            const event = {
                pathParameters: { teamId: "proj123" }
            };

            getProgressLogs.mockRejectedValue(new Error("Query failed"));

            const response = await getHistory(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal Server Error");
        });
    });
});
