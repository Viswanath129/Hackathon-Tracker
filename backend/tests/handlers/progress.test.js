// Ensure service modules are mocked using jest.mock() before requiring the handlers
jest.mock("../../services/progressService");
jest.mock("../../services/dynamoService");

const { logProgress, getProgressLogs } = require("../../services/progressService");
const dynamoService = require("../../services/dynamoService");
const { logUpdate, getHistory } = require("../../handlers/progress");

describe("Lambda Progress Handler - logUpdate", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should successfully log progress update and return 201 Created (no claims context)", async () => {
        logProgress.mockResolvedValue({ success: true, timestamp: "2023-10-10T12:00:00.000Z" });

        const event = {
            body: JSON.stringify({
                teamId: "team-123",
                updateText: "Added backend database service",
                deltaPercentage: 25
            })
        };

        const response = await logUpdate(event);

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.body);
        expect(body.message).toBe("Progress logged successfully");
        expect(logProgress).toHaveBeenCalledWith("team-123", "Added backend database service", 25);
    });

    test("should successfully log progress if claims context present and user is owner", async () => {
        logProgress.mockResolvedValue({ success: true });
        dynamoService.getUser.mockResolvedValue({ _id: "user-123", email: "team@test.com", role: "team" });
        dynamoService.getAllProjects.mockResolvedValue([
            { _id: "team-123", team_id: "user-123" }
        ]);

        const event = {
            body: JSON.stringify({
                teamId: "team-123",
                updateText: "Owner progress update",
                deltaPercentage: 10
            }),
            requestContext: {
                authorizer: {
                    claims: {
                        email: "team@test.com"
                    }
                }
            }
        };

        const response = await logUpdate(event);
        expect(response.statusCode).toBe(201);
        expect(logProgress).toHaveBeenCalledWith("team-123", "Owner progress update", 10);
    });

    test("should return 403 Forbidden if claims context present and user is not owner", async () => {
        dynamoService.getUser.mockResolvedValue({ _id: "user-other", email: "other@test.com", role: "team" });
        dynamoService.getAllProjects.mockResolvedValue([
            { _id: "team-123", team_id: "user-owner" }
        ]);

        const event = {
            body: JSON.stringify({
                teamId: "team-123",
                updateText: "Unauthorized update attempt",
                deltaPercentage: 10
            }),
            requestContext: {
                authorizer: {
                    claims: {
                        email: "other@test.com"
                    }
                }
            }
        };

        const response = await logUpdate(event);
        expect(response.statusCode).toBe(403);
        const body = JSON.parse(response.body);
        expect(body.message).toBe("Forbidden: You are not authorized for this project");
        expect(logProgress).not.toHaveBeenCalled();
    });

    test("should allow admin user to update even if not owner", async () => {
        logProgress.mockResolvedValue({ success: true });
        dynamoService.getUser.mockResolvedValue({ _id: "admin-id", email: "admin@test.com", role: "admin" });

        const event = {
            body: JSON.stringify({
                teamId: "team-123",
                updateText: "Admin override",
                deltaPercentage: 10
            }),
            requestContext: {
                authorizer: {
                    claims: {
                        email: "admin@test.com"
                    }
                }
            }
        };

        const response = await logUpdate(event);
        expect(response.statusCode).toBe(201);
        expect(dynamoService.getAllProjects).not.toHaveBeenCalled();
    });

    test("should return 400 Bad Request if request body is missing", async () => {
        const response = await logUpdate({});
        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.message).toContain("Required request body is missing");
        expect(logProgress).not.toHaveBeenCalled();
    });

    test("should return 400 Bad Request if JSON parsing fails", async () => {
        const event = {
            body: "{invalid-json"
        };
        const response = await logUpdate(event);
        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.message).toContain("Invalid JSON format");
    });

    test("should return 400 Bad Request if teamId is missing or empty", async () => {
        const event = {
            body: JSON.stringify({
                teamId: "   ",
                updateText: "No team",
                deltaPercentage: 10
            })
        };
        const response = await logUpdate(event);
        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.message).toContain("teamId is required");
    });

    test("should return 400 Bad Request if deltaPercentage is a boolean", async () => {
        const event = {
            body: JSON.stringify({
                teamId: "team-123",
                updateText: "Boolean exploit test",
                deltaPercentage: true
            })
        };
        const response = await logUpdate(event);
        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.message).toContain("deltaPercentage cannot be a boolean");
    });

    test("should return 500 Internal Server Error when service throws", async () => {
        logProgress.mockRejectedValue(new Error("Database connection timed out"));

        const event = {
            body: JSON.stringify({
                teamId: "team-123",
                updateText: "Exception handling test",
                deltaPercentage: 5
            })
        };

        const response = await logUpdate(event);
        expect(response.statusCode).toBe(500);
        const body = JSON.parse(response.body);
        expect(body.message).toBe("Internal Server Error");
    });
});

describe("Lambda Progress Handler - getHistory", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should successfully query progress logs and return 200 OK", async () => {
        const mockLogs = [
            { PK: "PROJ#team-123", SK: "LOG#123", update_text: "First log", delta_percentage: 10 }
        ];
        getProgressLogs.mockResolvedValue(mockLogs);

        const event = {
            pathParameters: {
                teamId: "team-123"
            }
        };

        const response = await getHistory(event);
        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body).toEqual(mockLogs);
        expect(getProgressLogs).toHaveBeenCalledWith("team-123");
    });

    test("should return 403 Forbidden if claims context present and user is not owner", async () => {
        dynamoService.getUser.mockResolvedValue({ _id: "user-other", email: "other@test.com", role: "team" });
        dynamoService.getAllProjects.mockResolvedValue([
            { _id: "team-123", team_id: "user-owner" }
        ]);

        const event = {
            pathParameters: {
                teamId: "team-123"
            },
            requestContext: {
                authorizer: {
                    claims: {
                        email: "other@test.com"
                    }
                }
            }
        };

        const response = await getHistory(event);
        expect(response.statusCode).toBe(403);
        const body = JSON.parse(response.body);
        expect(body.message).toBe("Forbidden: You are not authorized for this project");
        expect(getProgressLogs).not.toHaveBeenCalled();
    });

    test("should return 400 Bad Request if teamId path parameter is missing", async () => {
        const response = await getHistory({});
        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.message).toContain("teamId path parameter is required");
    });

    test("should return 500 Internal Server Error when getProgressLogs throws", async () => {
        getProgressLogs.mockRejectedValue(new Error("DynamoDB read failure"));

        const event = {
            pathParameters: {
                teamId: "team-123"
            }
        };

        const response = await getHistory(event);
        expect(response.statusCode).toBe(500);
        const body = JSON.parse(response.body);
        expect(body.message).toBe("Internal Server Error");
    });
});
