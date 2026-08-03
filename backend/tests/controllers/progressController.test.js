// Mock service modules FIRST
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock("../../services/progressService", () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

const { logUpdate, getHistory } = require("../../controllers/progressController");

describe("Progress Express Controllers", () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe("logUpdate", () => {
        it("should log progress and return 201 Created", async () => {
            mockLogProgress.mockResolvedValue({ success: true, timestamp: "2026-07-23T12:00:00.000Z" });
            req.body = {
                teamId: "team-123",
                updateText: "Milestone reached",
                deltaPercentage: 15
            };

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ success: true, timestamp: "2026-07-23T12:00:00.000Z" });
            expect(mockLogProgress).toHaveBeenCalledWith("team-123", "Milestone reached", 15);
        });

        it("should return 400 on input validation failure", async () => {
            req.body = {
                teamId: "",
                updateText: "Invalid validation",
                deltaPercentage: 20
            };

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining("teamId") });
            expect(mockLogProgress).not.toHaveBeenCalled();
        });

        it("should return 500 on database or internal service failure", async () => {
            mockLogProgress.mockRejectedValue(new Error("Service unavailable"));
            req.body = {
                teamId: "team-123",
                updateText: "Failure path",
                deltaPercentage: 5
            };

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: "Internal Server Error" });
        });
    });

    describe("getHistory", () => {
        it("should fetch progress history and return 200 OK", async () => {
            const mockLogs = [
                { PK: "PROJ#team-123", SK: "LOG#2", update_text: "Log 2", delta_percentage: 20 }
            ];
            mockGetProgressLogs.mockResolvedValue(mockLogs);
            req.params = { teamId: "team-123" };

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockLogs);
            expect(mockGetProgressLogs).toHaveBeenCalledWith("team-123");
        });

        it("should return 400 if teamId param is missing", async () => {
            req.params = { teamId: "" };

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: "teamId parameter is required" });
            expect(mockGetProgressLogs).not.toHaveBeenCalled();
        });

        it("should return 500 on service error", async () => {
            mockGetProgressLogs.mockRejectedValue(new Error("Service exception"));
            req.params = { teamId: "team-123" };

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: "Internal Server Error" });
        });
    });
});
