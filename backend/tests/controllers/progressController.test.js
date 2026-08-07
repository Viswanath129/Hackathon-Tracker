const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockGetProjectById = jest.fn();

jest.mock("../../services/progressService", () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args)
}));

jest.mock("../../services/dynamoService", () => ({
    getProjectById: (...args) => mockGetProjectById(...args)
}));

const { logUpdate, getHistory } = require("../../controllers/progressController");

describe("progressController tests", () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe("logUpdate", () => {
        it("should return 400 if validation fails", async () => {
            req.body = { teamId: "", updateText: "", deltaPercentage: 50 }; // empty fields
            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
        });

        it("should return 404 if project is not found", async () => {
            req.body = { teamId: "proj123", updateText: "Some progress", deltaPercentage: 10 };
            mockGetProjectById.mockResolvedValue(null);

            await logUpdate(req, res);

            expect(mockGetProjectById).toHaveBeenCalledWith("proj123");
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: "Project not found" });
        });

        it("should return 403 if user is not admin and does not own the project", async () => {
            req.body = { teamId: "proj123", updateText: "Some progress", deltaPercentage: 10 };
            req.user = { _id: "team_other", role: "team" };
            mockGetProjectById.mockResolvedValue({ _id: "proj123", team_id: "team_owner" });

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: "Forbidden: You do not own this project" });
        });

        it("should succeed (return 201) and log progress if user is the project owner", async () => {
            req.body = { teamId: "proj123", updateText: "Some progress", deltaPercentage: 10 };
            req.user = { _id: "team_owner", role: "team" };
            mockGetProjectById.mockResolvedValue({ _id: "proj123", team_id: "team_owner" });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: "2025-01-01" });

            await logUpdate(req, res);

            expect(mockLogProgress).toHaveBeenCalledWith("proj123", "Some progress", 10);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ success: true, timestamp: "2025-01-01" });
        });

        it("should succeed (return 201) if user is admin, even if they don't own the project", async () => {
            req.body = { teamId: "proj123", updateText: "Admin update", deltaPercentage: 20 };
            req.user = { _id: "team_admin", role: "admin" };
            mockGetProjectById.mockResolvedValue({ _id: "proj123", team_id: "team_owner" });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: "2025-01-01" });

            await logUpdate(req, res);

            expect(mockLogProgress).toHaveBeenCalledWith("proj123", "Admin update", 20);
            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe("getHistory", () => {
        it("should return 400 if teamId param is missing", async () => {
            req.params = {};
            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("should return 404 if project is not found", async () => {
            req.params = { teamId: "proj123" };
            mockGetProjectById.mockResolvedValue(null);

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        it("should return 403 if user is not admin and does not own the project", async () => {
            req.params = { teamId: "proj123" };
            req.user = { _id: "team_other", role: "team" };
            mockGetProjectById.mockResolvedValue({ _id: "proj123", team_id: "team_owner" });

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
        });

        it("should return 200 and progress logs if user owns the project", async () => {
            req.params = { teamId: "proj123" };
            req.user = { _id: "team_owner", role: "team" };
            mockGetProjectById.mockResolvedValue({ _id: "proj123", team_id: "team_owner" });
            const mockLogs = [{ timestamp: "123", update_text: "test" }];
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            await getHistory(req, res);

            expect(mockGetProgressLogs).toHaveBeenCalledWith("proj123");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockLogs);
        });
    });
});
