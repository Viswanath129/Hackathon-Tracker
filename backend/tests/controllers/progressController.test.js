// Mock progressService before requiring progress controller
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock("../../services/progressService", () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

const { logUpdate, getHistory } = require("../../controllers/progressController");

describe("progressController", () => {
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
        it("should successfully log progress update and return 201", async () => {
            mockLogProgress.mockResolvedValue({ success: true });

            req.body = {
                teamId: "proj-123",
                updateText: "Progress update",
                deltaPercentage: 5
            };

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ message: "Progress logged successfully" });
            expect(mockLogProgress).toHaveBeenCalledWith("proj-123", "Progress update", 5);
        });

        it("should return 400 when validation fails", async () => {
            req.body = {
                teamId: "",
                updateText: "Invalid validation",
                deltaPercentage: 5
            };

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: expect.stringContaining("teamId") });
            expect(mockLogProgress).not.toHaveBeenCalled();
        });

        it("should return 500 when service throws error", async () => {
            mockLogProgress.mockRejectedValue(new Error("Internal database failure"));

            req.body = {
                teamId: "proj-123",
                updateText: "Progress update",
                deltaPercentage: 5
            };

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "Internal Server Error" });
        });
    });

    describe("getHistory", () => {
        it("should successfully retrieve progress logs and return 200", async () => {
            const mockLogs = [
                { PK: "PROJ#proj-123", update_text: "Update 1", delta_percentage: 10 }
            ];
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            req.params.teamId = "proj-123";

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockLogs);
            expect(mockGetProgressLogs).toHaveBeenCalledWith("proj-123");
        });

        it("should return 400 if teamId parameter is missing or empty", async () => {
            req.params.teamId = "";

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "teamId parameter is required" });
            expect(mockGetProgressLogs).not.toHaveBeenCalled();
        });

        it("should return 500 when service throws error", async () => {
            mockGetProgressLogs.mockRejectedValue(new Error("Query error"));

            req.params.teamId = "proj-123";

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "Internal Server Error" });
        });
    });
});
