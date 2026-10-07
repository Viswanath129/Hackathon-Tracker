const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    test('returns valid for valid input', () => {
        const input = {
            teamId: 'proj_123',
            updateText: 'Completed setup',
            deltaPercentage: 25
        };
        expect(validateProgressInput(input)).toEqual({ valid: true });
    });

    test('rejects missing teamId', () => {
        const input = {
            updateText: 'Completed setup',
            deltaPercentage: 25
        };
        expect(validateProgressInput(input)).toEqual({
            valid: false,
            message: 'teamId must be a non-empty string'
        });
    });

    test('rejects non-string teamId', () => {
        const input = {
            teamId: 123,
            updateText: 'Completed setup',
            deltaPercentage: 25
        };
        expect(validateProgressInput(input)).toEqual({
            valid: false,
            message: 'teamId must be a non-empty string'
        });
    });

    test('rejects missing updateText', () => {
        const input = {
            teamId: 'proj_123',
            deltaPercentage: 25
        };
        expect(validateProgressInput(input)).toEqual({
            valid: false,
            message: 'updateText must be a non-empty string'
        });
    });

    test('rejects missing deltaPercentage', () => {
        const input = {
            teamId: 'proj_123',
            updateText: 'Completed setup'
        };
        expect(validateProgressInput(input)).toEqual({
            valid: false,
            message: 'deltaPercentage is required'
        });
    });

    test('rejects boolean deltaPercentage', () => {
        const input = {
            teamId: 'proj_123',
            updateText: 'Completed setup',
            deltaPercentage: true
        };
        expect(validateProgressInput(input)).toEqual({
            valid: false,
            message: 'deltaPercentage cannot be a boolean'
        });
    });

    test('rejects deltaPercentage out of range (-101)', () => {
        const input = {
            teamId: 'proj_123',
            updateText: 'Completed setup',
            deltaPercentage: -101
        };
        expect(validateProgressInput(input)).toEqual({
            valid: false,
            message: 'deltaPercentage must be between -100 and 100'
        });
    });

    test('rejects deltaPercentage out of range (101)', () => {
        const input = {
            teamId: 'proj_123',
            updateText: 'Completed setup',
            deltaPercentage: 101
        };
        expect(validateProgressInput(input)).toEqual({
            valid: false,
            message: 'deltaPercentage must be between -100 and 100'
        });
    });
});
