const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    test('validates valid progress update payload', () => {
        const result = validateProgressInput({
            teamId: 'team_123',
            updateText: 'Completed module setup',
            deltaPercentage: 15
        });
        expect(result.isValid).toBe(true);
    });

    test('rejects missing payload', () => {
        const result = validateProgressInput(null);
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/missing/i);
    });

    test('rejects missing or empty teamId', () => {
        const result = validateProgressInput({
            teamId: '   ',
            updateText: 'Some update',
            deltaPercentage: 10
        });
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/teamId/i);
    });

    test('rejects missing or empty updateText', () => {
        const result = validateProgressInput({
            teamId: 'team_123',
            updateText: '',
            deltaPercentage: 10
        });
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/updateText/i);
    });

    test('rejects boolean values for deltaPercentage', () => {
        const result = validateProgressInput({
            teamId: 'team_123',
            updateText: 'Some update',
            deltaPercentage: true
        });
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/boolean/i);
    });

    test('rejects deltaPercentage below -100', () => {
        const result = validateProgressInput({
            teamId: 'team_123',
            updateText: 'Some update',
            deltaPercentage: -150
        });
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/between -100 and 100/i);
    });

    test('rejects deltaPercentage above 100', () => {
        const result = validateProgressInput({
            teamId: 'team_123',
            updateText: 'Some update',
            deltaPercentage: 120
        });
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/between -100 and 100/i);
    });
});
