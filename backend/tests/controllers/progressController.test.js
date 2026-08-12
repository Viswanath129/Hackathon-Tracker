// Mock service modules BEFORE requiring the controller
jest.mock("../../services/progressService", () => ({
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
}));

const { logUpdate, getHistory } = require("../../controllers/progressController");
const { logProgress, getProgressLogs } = require("../../services/progressService");

describe("Progress Express Controllers", () => {
    let req;
    let res;

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

    describe("logUpdate controller", () => {
        test("should return 400 when validation fails", async () => {
            req.body = {
                updateText: "Working on tests",
                deltaPercentage: 5
            }; // Missing teamId

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining("teamId")
            }));
        });

        test("should return 400 when deltaPercentage is a boolean value", async () => {
            req.body = {
                teamId: "proj-abc",
                updateText: "Working on tests",
                deltaPercentage: false
            };

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining("deltaPercentage")
            }));
        });

        test("should return 201 and log progress successfully", async () => {
            req.body = {
                teamId: "proj-abc",
                updateText: "Completed feature",
                deltaPercentage: 35
            };
            logProgress.mockResolvedValue({ success: true });

            await logUpdate(req, res);

            expect(logProgress).toHaveBeenCalledWith("proj-abc", "Completed feature", 35);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ message: "Progress logged successfully" });
        });

        test("should return 500 when logProgress service throws an error", async () => {
            req.body = {
                teamId: "proj-abc",
                updateText: "Completed feature",
                deltaPercentage: 35
            };
            logProgress.mockRejectedValue(new Error("Database error"));

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "Internal Server Error" });
        });
    });

    describe("getHistory controller", () => {
        test("should return 400 when teamId is missing in request params", async () => {
            req.params = {}; // missing teamId

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Missing teamId" });
        });

        test("should return 200 and return logs successfully", async () => {
            req.params = { teamId: "proj-abc" };
            const mockLogs = [
                { PK: "PROJ#proj-abc", SK: "LOG#1", update_text: "log 1" }
            ];
            getProgressLogs.mockResolvedValue(mockLogs);

            await getHistory(req, res);

            expect(getProgressLogs).toHaveBeenCalledWith("proj-abc");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockLogs);
        });

        test("should return 500 when getProgressLogs service throws an error", async () => {
            req.params = { teamId: "proj-abc" };
            getProgressLogs.mockRejectedValue(new Error("Database error"));

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "Internal Server Error" });
        });
    });
});
