const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    test('should reject non-object body or missing body', () => {
        expect(validateProgressInput(null)).toEqual({
            isValid: false,
            message: 'Invalid request body'
        });
        expect(validateProgressInput('invalid')).toEqual({
            isValid: false,
            message: 'Invalid request body'
        });
    });

    test('should reject missing or empty teamId', () => {
        expect(validateProgressInput({ updateText: 'Log', deltaPercentage: 10 })).toEqual({
            isValid: false,
            message: 'teamId is required and must be a non-empty string'
        });
        expect(validateProgressInput({ teamId: '   ', updateText: 'Log', deltaPercentage: 10 })).toEqual({
            isValid: false,
            message: 'teamId is required and must be a non-empty string'
        });
    });

    test('should reject missing or empty updateText', () => {
        expect(validateProgressInput({ teamId: 'proj_123', deltaPercentage: 10 })).toEqual({
            isValid: false,
            message: 'updateText is required and must be a non-empty string'
        });
        expect(validateProgressInput({ teamId: 'proj_123', updateText: '   ', deltaPercentage: 10 })).toEqual({
            isValid: false,
            message: 'updateText is required and must be a non-empty string'
        });
    });

    test('should reject boolean deltaPercentage', () => {
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'Done', deltaPercentage: true })).toEqual({
            isValid: false,
            message: 'deltaPercentage must be a numeric value between -100 and 100'
        });
    });

    test('should reject out-of-range or NaN deltaPercentage', () => {
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'Done', deltaPercentage: 150 })).toEqual({
            isValid: false,
            message: 'deltaPercentage must be a numeric value between -100 and 100'
        });
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'Done', deltaPercentage: -101 })).toEqual({
            isValid: false,
            message: 'deltaPercentage must be a numeric value between -100 and 100'
        });
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'Done', deltaPercentage: 'abc' })).toEqual({
            isValid: false,
            message: 'deltaPercentage must be a numeric value between -100 and 100'
        });
    });

    test('should accept valid inputs and return numDelta', () => {
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'Completed auth', deltaPercentage: 25 })).toEqual({
            isValid: true,
            numDelta: 25
        });
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'Reverted auth', deltaPercentage: '-15' })).toEqual({
            isValid: true,
            numDelta: -15
        });
    });
});
