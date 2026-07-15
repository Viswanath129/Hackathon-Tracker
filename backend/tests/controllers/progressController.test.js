const { logUpdate, getHistory } = require("../../controllers/progressController");
const progressService = require("../../services/progressService");

jest.mock("../../services/progressService");

describe("Progress Controller", () => {
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
        it("should return 201 when progress is logged successfully", async () => {
            req.body = {
                teamId: "team123",
                updateText: "Finished feature A",
                deltaPercentage: 10
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: "2023-10-27T10:00:00Z" });

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: "Progress logged successfully",
                success: true
            }));
        });

        it("should return 400 when teamId is invalid", async () => {
            req.body = { teamId: "", updateText: "test", deltaPercentage: 10 };
            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "teamId must be a non-empty string" });
        });
    });

    describe("getHistory", () => {
        it("should return 200 and logs when teamId is provided", async () => {
            req.params.teamId = "team123";
            const mockLogs = [{ SK: "LOG#1", update_text: "Update 1" }];
            progressService.getProgressLogs.mockResolvedValue(mockLogs);

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockLogs);
        });

        it("should return 400 when teamId is missing", async () => {
            req.params.teamId = undefined;
            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "teamId parameter is required" });
        });
    });
});
