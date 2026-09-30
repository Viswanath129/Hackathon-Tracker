const mockProgressService = {
    logProgress: jest.fn(),
    getProgressLogs: jest.fn(),
    getProjectById: jest.fn()
};

jest.mock("../../services/progressService", () => mockProgressService);

const { logUpdate, getHistory } = require("../../controllers/progressController");

describe("Express Progress Controller", () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            params: {},
            user: { _id: "user_1", email: "owner@example.com", role: "user" }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe("logUpdate", () => {
        test("returns 400 when deltaPercentage is invalid", async () => {
            req.body = {
                teamId: "proj_123",
                updateText: "Added backend unit tests",
                deltaPercentage: "not-a-number"
            };

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ message: expect.stringMatching(/deltaPercentage/) })
            );
        });

        test("returns 404 when project is not found", async () => {
            req.body = {
                teamId: "missing_proj",
                updateText: "Updated schema",
                deltaPercentage: 15
            };
            mockProgressService.getProjectById.mockResolvedValue(null);

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: "Project not found" });
        });

        test("returns 403 when user does not own project", async () => {
            req.user = { _id: "user_2", email: "other@example.com", role: "user" };
            req.body = {
                teamId: "proj_123",
                updateText: "Unauthorized edit",
                deltaPercentage: 20
            };
            mockProgressService.getProjectById.mockResolvedValue({
                _id: "proj_123",
                teamId: "user_1",
                email: "owner@example.com"
            });

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ message: expect.stringMatching(/Forbidden/) })
            );
        });

        test("returns 201 Created on success", async () => {
            req.body = {
                teamId: "proj_123",
                updateText: "Completed feature implementation",
                deltaPercentage: 50
            };
            mockProgressService.getProjectById.mockResolvedValue({
                _id: "proj_123",
                teamId: "user_1",
                email: "owner@example.com"
            });
            mockProgressService.logProgress.mockResolvedValue({ success: true, timestamp: "2026-02-28T00:00:00.000Z" });

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: "Progress logged successfully",
                data: { success: true, timestamp: "2026-02-28T00:00:00.000Z" }
            });
        });
    });

    describe("getHistory", () => {
        test("returns 404 when project is not found", async () => {
            req.params = { teamId: "proj_404" };
            mockProgressService.getProjectById.mockResolvedValue(null);

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: "Project not found" });
        });

        test("returns 200 OK with progress history logs", async () => {
            req.params = { teamId: "proj_123" };
            mockProgressService.getProjectById.mockResolvedValue({
                _id: "proj_123",
                teamId: "user_1",
                email: "owner@example.com"
            });
            const mockLogs = [
                { update_text: "Created Express routes", delta_percentage: 20, timestamp: "2026-02-28T00:00:00.000Z" }
            ];
            mockProgressService.getProgressLogs.mockResolvedValue(mockLogs);

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: mockLogs });
        });
    });
});
