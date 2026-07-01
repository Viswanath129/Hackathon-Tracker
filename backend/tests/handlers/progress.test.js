const { logUpdate, getHistory } = require("../../handlers/progress");
const progressService = require("../../services/progressService");

jest.mock("../../services/progressService", () => {
    const actual = jest.requireActual("../../services/progressService");
    return {
        ...actual,
        logProgress: jest.fn(),
        getProgressLogs: jest.fn()
    };
});

describe("Progress Handlers (Lambda)", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("logUpdate", () => {
        test("should return 201 when valid data is provided", async () => {
            const event = {
                body: JSON.stringify({
                    teamId: "team-123",
                    updateText: "Finished API",
                    deltaPercentage: 15
                })
            };

            progressService.logProgress.mockResolvedValue({ success: true, timestamp: "2023-01-01" });

            const response = await logUpdate(event);

            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body).message).toBe("Progress logged successfully");
        });

        test("should return 400 when validation fails", async () => {
            const event = {
                body: JSON.stringify({
                    updateText: "No teamId",
                    deltaPercentage: 10
                })
            };

            progressService.logProgress.mockImplementation((teamId, text, delta) => {
                const { validateProgressInput } = jest.requireActual("../../services/progressService");
                validateProgressInput(teamId, text, delta);
            });

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain("teamId must be a non-empty string");
        });
    });

    describe("getHistory", () => {
        test("should return 200 when teamId is provided", async () => {
            const event = {
                pathParameters: { teamId: "team-123" }
            };

            progressService.getProgressLogs.mockResolvedValue([{ PK: "PROJ#team-123" }]);

            const response = await getHistory(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toHaveLength(1);
        });
    });
});
