jest.mock("../../services/progressService", () => ({
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
}));

jest.mock("../../services/dynamoService", () => ({
    getProjectById: jest.fn()
}));

const { logProgress, getProgressLogs } = require("../../services/progressService");
const { getProjectById } = require("../../services/dynamoService");
const { logUpdate, getHistory } = require("../../controllers/progressController");

describe("Express Controller: progressController.js", () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        mockReq = {
            body: {},
            params: {},
            user: { email: "team@example.com", _id: "team123", role: "team" }
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        it("should return 400 for invalid input payload", async () => {
            mockReq.body = { teamId: "proj1", updateText: "", deltaPercentage: 50 };
            await logUpdate(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it("should return 403 for unauthorized project ownership", async () => {
            mockReq.body = { teamId: "proj1", updateText: "Progress", deltaPercentage: 20 };
            getProjectById.mockResolvedValue({ _id: "proj1", teamEmail: "other@example.com" });

            await logUpdate(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it("should return 201 Created when update is successfully logged", async () => {
            mockReq.body = { teamId: "proj1", updateText: "Progress update", deltaPercentage: 20 };
            getProjectById.mockResolvedValue({ _id: "proj1", teamEmail: "team@example.com" });
            logProgress.mockResolvedValue({ success: true, timestamp: "2026-03-01" });

            await logUpdate(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(logProgress).toHaveBeenCalledWith("proj1", "Progress update", 20);
        });
    });

    describe("getHistory", () => {
        it("should return 200 OK with history logs for authorized user", async () => {
            mockReq.params = { teamId: "proj1" };
            getProjectById.mockResolvedValue({ _id: "proj1", teamEmail: "team@example.com" });
            getProgressLogs.mockResolvedValue([{ update_text: "Log 1" }]);

            await getHistory(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                teamId: "proj1",
                logs: [{ update_text: "Log 1" }]
            });
        });
    });
});
