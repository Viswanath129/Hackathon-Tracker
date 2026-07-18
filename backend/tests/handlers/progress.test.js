// Mock progressService before requiring progress handlers
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock("../../services/progressService", () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

const { logUpdate, getHistory } = require("../../handlers/progress");

describe("progress lambda handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        it("should successfully log progress update and return 201", async () => {
            mockLogProgress.mockResolvedValue({ success: true });

            const event = {
                body: JSON.stringify({
                    teamId: "proj-123",
                    updateText: "Completed feature alpha",
                    deltaPercentage: 20
                })
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body).message).toBe("Progress logged successfully");
            expect(mockLogProgress).toHaveBeenCalledWith("proj-123", "Completed feature alpha", 20);
        });

        it("should handle pre-parsed body safely", async () => {
            mockLogProgress.mockResolvedValue({ success: true });

            const event = {
                body: {
                    teamId: "proj-123",
                    updateText: "Completed feature beta",
                    deltaPercentage: 30
                }
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(201);
            expect(mockLogProgress).toHaveBeenCalledWith("proj-123", "Completed feature beta", 30);
        });

        it("should return 400 for missing request body", async () => {
            const response = await logUpdate({});
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("missing");
        });

        it("should return 400 for invalid JSON format", async () => {
            const event = { body: "{invalid-json" };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("JSON");
        });

        it("should return 400 for validation failure", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "",
                    updateText: "Invalid",
                    deltaPercentage: 15
                })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("teamId");
        });

        it("should return 500 on service error", async () => {
            mockLogProgress.mockRejectedValue(new Error("DynamoDB Error"));

            const event = {
                body: JSON.stringify({
                    teamId: "proj-123",
                    updateText: "Valid update",
                    deltaPercentage: 10
                })
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal Server Error");
        });
    });

    describe("getHistory", () => {
        it("should successfully get logs and return 200", async () => {
            const mockLogs = [
                { PK: "PROJ#proj-123", update_text: "Update 1", delta_percentage: 10 }
            ];
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            const event = {
                pathParameters: { teamId: "proj-123" }
            };

            const response = await getHistory(event);
            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
            expect(mockGetProgressLogs).toHaveBeenCalledWith("proj-123");
        });

        it("should return 400 for missing or empty teamId", async () => {
            const event = { pathParameters: {} };
            const response = await getHistory(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("teamId");
        });

        it("should return 500 on service error", async () => {
            mockGetProgressLogs.mockRejectedValue(new Error("DynamoDB Query Fail"));

            const event = {
                pathParameters: { teamId: "proj-123" }
            };

            const response = await getHistory(event);
            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe("Internal Server Error");
        });
    });
});
