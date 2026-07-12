const { logUpdate, getHistory } = require("../../controllers/progressController");
const { logProgress, getProgressLogs } = require("../../services/progressService");

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
        it("should return 201 on successful progress log", async () => {
            req.body = {
                teamId: "team-123",
                updateText: "Finished feature A",
                deltaPercentage: 10
            };

            logProgress.mockResolvedValue({ success: true, timestamp: "2023-01-01T00:00:00.000Z" });

            await logUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
            expect(logProgress).toHaveBeenCalledWith("team-123", "Finished feature A", 10);
        });

        it("should return 400 for missing teamId", async () => {
            req.body = {
                updateText: "test",
                deltaPercentage: 5
            };
            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: "teamId must be a non-empty string" });
        });

        it("should return 400 for invalid deltaPercentage", async () => {
            req.body = {
                teamId: "t1",
                updateText: "test",
                deltaPercentage: 150
            };
            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: "deltaPercentage must be a number between -100 and 100" });
        });

        it("should return 500 on service failure", async () => {
            req.body = {
                teamId: "team-123",
                updateText: "Finished feature A",
                deltaPercentage: 10
            };
            logProgress.mockRejectedValue(new Error("DynamoDB error"));

            await logUpdate(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: "Internal Server Error" });
        });
    });

    describe("getHistory", () => {
        it("should return 200 and logs for a valid teamId", async () => {
            req.params.teamId = "team-123";
            const mockLogs = [{ update_text: "log 1" }];
            getProgressLogs.mockResolvedValue(mockLogs);

            await getHistory(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ logs: mockLogs });
            expect(getProgressLogs).toHaveBeenCalledWith("team-123");
        });

        it("should return 500 on service failure", async () => {
            req.params.teamId = "team-123";
            getProgressLogs.mockRejectedValue(new Error("Query failed"));

            await getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: "Internal Server Error" });
        });
    });
});
