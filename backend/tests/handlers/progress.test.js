const { logUpdate, getHistory } = require('../../handlers/progress');
const { logProgress, getProgressLogs } = require('../../services/progressService');

jest.mock('../../services/progressService');

describe('Progress Lambda Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logUpdate', () => {
    it('should return 201 when progress is successfully logged', async () => {
      const event = {
        body: JSON.stringify({
          teamId: 'team123',
          updateText: 'Started working on UI',
          deltaPercentage: 15
        })
      };

      logProgress.mockResolvedValue({ success: true, timestamp: '2023-10-27T10:00:00Z' });

      const response = await logUpdate(event);

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(logProgress).toHaveBeenCalledWith('team123', 'Started working on UI', 15);
    });

    it('should return 400 for missing fields', async () => {
      const event = {
        body: JSON.stringify({
          teamId: 'team123'
          // missing updateText and deltaPercentage
        })
      };

      const response = await logUpdate(event);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).message).toContain('Missing required fields');
    });

    it('should return 400 for invalid deltaPercentage', async () => {
      const event = {
        body: JSON.stringify({
          teamId: 'team123',
          updateText: 'test',
          deltaPercentage: 150 // > 100
        })
      };

      const response = await logUpdate(event);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).message).toContain('deltaPercentage must be a number between 0 and 100');
    });

    it('should return 400 for malformed JSON', async () => {
      const event = {
        body: '{ invalid json }'
      };

      const response = await logUpdate(event);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).message).toBe('Invalid JSON');
    });

    it('should return 500 when service throws error', async () => {
      const event = {
        body: JSON.stringify({
          teamId: 'team123',
          updateText: 'test',
          deltaPercentage: 10
        })
      };

      logProgress.mockRejectedValue(new Error('DynamoDB Error'));

      const response = await logUpdate(event);

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).message).toBe('Internal Server Error');
    });
  });

  describe('getHistory', () => {
    it('should return 200 and list of logs', async () => {
      const event = {
        pathParameters: { teamId: 'team123' }
      };

      const mockLogs = [
        { PK: 'PROJ#team123', SK: 'LOG#1', update_text: 'Log 1', delta_percentage: 10 }
      ];
      getProgressLogs.mockResolvedValue(mockLogs);

      const response = await getHistory(event);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(mockLogs);
      expect(getProgressLogs).toHaveBeenCalledWith('team123');
    });

    it('should return 400 when teamId is missing', async () => {
      const event = {
        pathParameters: {}
      };

      const response = await getHistory(event);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).message).toBe('teamId is required');
    });

    it('should return 500 when service throws error', async () => {
      const event = {
        pathParameters: { teamId: 'team123' }
      };

      getProgressLogs.mockRejectedValue(new Error('DynamoDB Error'));

      const response = await getHistory(event);

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).message).toBe('Internal Server Error');
    });
  });
});
