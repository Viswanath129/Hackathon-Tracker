// Ensure service modules are mocked using jest.mock() before requiring the handlers
jest.mock("../../services/progressService");
jest.mock("../../services/dynamoService");

const { logProgress, getProgressLogs } = require("../../services/progressService");
const dynamoService = require("../../services/dynamoService");
const { logUpdate, getHistory } = require("../../controllers/progressController");

describe("Express Progress Controller - logUpdate", () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {},
            user: { _id: "user-123", role: "team" }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    test("should successfully log progress update if user is the project owner", async () => {
        req.body = {
            teamId: "team-456",
            updateText: "Added unit testing suite",
            deltaPercentage: 15
        };
        logProgress.mockResolvedValue({ success: true });
        dynamoService.getAllProjects.mockResolvedValue([
            { _id: "team-456", team_id: "user-123" }
        ]);

        await logUpdate(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ message: "Progress logged successfully" });
    });

    test("should allow logging if user is admin even if not owner", async () => {
        req.user = { _id: "admin-id", role: "admin" };
        req.body = {
            teamId: "team-456",
            updateText: "Admin forced update",
            deltaPercentage: 15
        };
        logProgress.mockResolvedValue({ success: true });

        await logUpdate(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(dynamoService.getAllProjects).not.toHaveBeenCalled();
    });

    test("should return 403 Forbidden if user is not the project owner and not admin", async () => {
        req.body = {
            teamId: "team-456",
            updateText: "Malicious update",
            deltaPercentage: 15
        };
        dynamoService.getAllProjects.mockResolvedValue([
            { _id: "team-456", team_id: "other-user-id" }
        ]);

        await logUpdate(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: "Forbidden: You are not authorized for this project" });
        expect(logProgress).not.toHaveBeenCalled();
    });

    test("should return 400 Bad Request if validation fails", async () => {
        req.body = {
            teamId: "",
            updateText: "Validation error",
            deltaPercentage: 5
        };

        await logUpdate(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: "teamId is required and must be a non-empty string"
        });
        expect(logProgress).not.toHaveBeenCalled();
    });

    test("should return 500 Internal Server Error when service throws an exception", async () => {
        req.body = {
            teamId: "team-456",
            updateText: "Exception flow",
            deltaPercentage: 5
        };
        dynamoService.getAllProjects.mockRejectedValue(new Error("Database disconnected"));

        await logUpdate(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Database disconnected" });
    });
});

describe("Express Progress Controller - getHistory", () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            params: {},
            user: { _id: "user-123", role: "team" }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    test("should successfully retrieve logs if user is the project owner", async () => {
        req.params.teamId = "team-456";
        const mockLogs = [
            { PK: "PROJ#team-456", SK: "LOG#1", update_text: "Log 1", delta_percentage: 20 }
        ];
        getProgressLogs.mockResolvedValue(mockLogs);
        dynamoService.getAllProjects.mockResolvedValue([
            { _id: "team-456", team_id: "user-123" }
        ]);

        await getHistory(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockLogs);
        expect(getProgressLogs).toHaveBeenCalledWith("team-456");
    });

    test("should return 403 Forbidden if user is not the project owner and not admin", async () => {
        req.params.teamId = "team-456";
        dynamoService.getAllProjects.mockResolvedValue([
            { _id: "team-456", team_id: "other-user-id" }
        ]);

        await getHistory(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: "Forbidden: You are not authorized for this project" });
        expect(getProgressLogs).not.toHaveBeenCalled();
    });

    test("should return 400 Bad Request if teamId param is missing", async () => {
        req.params.teamId = "";

        await getHistory(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "teamId parameter is required" });
        expect(getProgressLogs).not.toHaveBeenCalled();
    });

    test("should return 500 Internal Server Error when service throws", async () => {
        req.params.teamId = "team-456";
        dynamoService.getAllProjects.mockRejectedValue(new Error("AWS error description"));

        await getHistory(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "AWS error description" });
    });
});
