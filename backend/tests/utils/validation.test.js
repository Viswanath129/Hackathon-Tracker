const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    test('should return valid true for a completely valid object', () => {
        const input = {
            teamId: 'proj_123',
            updateText: 'Completed setup of DynamoDB client',
            deltaPercentage: 15
        };
        expect(validateProgressInput(input)).toEqual({ valid: true });
    });

    test('should return valid true for negative deltaPercentage within bounds', () => {
        const input = {
            teamId: 'proj_123',
            updateText: 'Reverted bad deployment',
            deltaPercentage: -10
        };
        expect(validateProgressInput(input)).toEqual({ valid: true });
    });

    test('should return valid true for deltaPercentage represented as a valid string', () => {
        const input = {
            teamId: 'proj_123',
            updateText: 'Updated docs',
            deltaPercentage: '20'
        };
        expect(validateProgressInput(input)).toEqual({ valid: true });
    });

    test('should return valid false when body is missing', () => {
        expect(validateProgressInput(null)).toEqual({
            valid: false,
            message: 'Request body is missing'
        });
    });

    test('should return valid false when teamId is missing or empty', () => {
        const input = {
            updateText: 'Fixed build issues',
            deltaPercentage: 5
        };
        expect(validateProgressInput(input)).toEqual({
            valid: false,
            message: 'teamId must be a non-empty string'
        });

        const input2 = {
            teamId: '   ',
            updateText: 'Fixed build issues',
            deltaPercentage: 5
        };
        expect(validateProgressInput(input2)).toEqual({
            valid: false,
            message: 'teamId must be a non-empty string'
        });
    });

    test('should return valid false when updateText is missing or empty', () => {
        const input = {
            teamId: 'proj_123',
            deltaPercentage: 5
        };
        expect(validateProgressInput(input)).toEqual({
            valid: false,
            message: 'updateText must be a non-empty string'
        });

        const input2 = {
            teamId: 'proj_123',
            updateText: '\n\t  ',
            deltaPercentage: 5
        };
        expect(validateProgressInput(input2)).toEqual({
            valid: false,
            message: 'updateText must be a non-empty string'
        });
    });

    test('should explicitly reject boolean values for deltaPercentage', () => {
        const input1 = {
            teamId: 'proj_123',
            updateText: 'Tested some code',
            deltaPercentage: true
        };
        expect(validateProgressInput(input1)).toEqual({
            valid: false,
            message: 'deltaPercentage cannot be a boolean'
        });

        const input2 = {
            teamId: 'proj_123',
            updateText: 'Tested some code',
            deltaPercentage: false
        };
        expect(validateProgressInput(input2)).toEqual({
            valid: false,
            message: 'deltaPercentage cannot be a boolean'
        });
    });

    test('should reject non-numeric deltaPercentage values', () => {
        const input1 = {
            teamId: 'proj_123',
            updateText: 'Tested some code',
            deltaPercentage: 'abc'
        };
        expect(validateProgressInput(input1)).toEqual({
            valid: false,
            message: 'deltaPercentage must be a numeric value'
        });

        const input2 = {
            teamId: 'proj_123',
            updateText: 'Tested some code',
            deltaPercentage: null
        };
        expect(validateProgressInput(input2)).toEqual({
            valid: false,
            message: 'deltaPercentage must be a numeric value'
        });
    });

    test('should reject out of bound deltaPercentage values', () => {
        const input1 = {
            teamId: 'proj_123',
            updateText: 'Tested some code',
            deltaPercentage: 101
        };
        expect(validateProgressInput(input1)).toEqual({
            valid: false,
            message: 'deltaPercentage must be between -100 and 100'
        });

        const input2 = {
            teamId: 'proj_123',
            updateText: 'Tested some code',
            deltaPercentage: -101
        };
        expect(validateProgressInput(input2)).toEqual({
            valid: false,
            message: 'deltaPercentage must be between -100 and 100'
        });
    });
});
