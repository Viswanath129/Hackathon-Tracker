const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput Utility', () => {
    test('should fail if input is missing or null', () => {
        expect(validateProgressInput(null)).toEqual({
            isValid: false,
            error: 'Request body is required'
        });
        expect(validateProgressInput(undefined)).toEqual({
            isValid: false,
            error: 'Request body is required'
        });
    });

    test('should fail if teamId is missing or empty', () => {
        expect(validateProgressInput({ teamId: '', updateText: 'valid', deltaPercentage: 10 })).toEqual({
            isValid: false,
            error: 'teamId must be a non-empty string'
        });
        expect(validateProgressInput({ teamId: '   ', updateText: 'valid', deltaPercentage: 10 })).toEqual({
            isValid: false,
            error: 'teamId must be a non-empty string'
        });
        expect(validateProgressInput({ teamId: 123, updateText: 'valid', deltaPercentage: 10 })).toEqual({
            isValid: false,
            error: 'teamId must be a non-empty string'
        });
    });

    test('should fail if updateText is missing or empty', () => {
        expect(validateProgressInput({ teamId: 'team1', updateText: '', deltaPercentage: 10 })).toEqual({
            isValid: false,
            error: 'updateText must be a non-empty string'
        });
        expect(validateProgressInput({ teamId: 'team1', updateText: '   ', deltaPercentage: 10 })).toEqual({
            isValid: false,
            error: 'updateText must be a non-empty string'
        });
    });

    test('should explicitly reject boolean values for deltaPercentage', () => {
        expect(validateProgressInput({ teamId: 'team1', updateText: 'progress', deltaPercentage: true })).toEqual({
            isValid: false,
            error: 'deltaPercentage must be a numeric value between -100 and 100'
        });
        expect(validateProgressInput({ teamId: 'team1', updateText: 'progress', deltaPercentage: false })).toEqual({
            isValid: false,
            error: 'deltaPercentage must be a numeric value between -100 and 100'
        });
    });

    test('should fail if deltaPercentage is outside [-100, 100] or invalid numeric', () => {
        expect(validateProgressInput({ teamId: 'team1', updateText: 'progress', deltaPercentage: 101 })).toEqual({
            isValid: false,
            error: 'deltaPercentage must be a numeric value between -100 and 100'
        });
        expect(validateProgressInput({ teamId: 'team1', updateText: 'progress', deltaPercentage: -101 })).toEqual({
            isValid: false,
            error: 'deltaPercentage must be a numeric value between -100 and 100'
        });
        expect(validateProgressInput({ teamId: 'team1', updateText: 'progress', deltaPercentage: 'abc' })).toEqual({
            isValid: false,
            error: 'deltaPercentage must be a numeric value between -100 and 100'
        });
    });

    test('should pass for valid inputs', () => {
        expect(validateProgressInput({ teamId: 'team123', updateText: 'Built auth feature', deltaPercentage: 25 })).toEqual({
            isValid: true
        });
        expect(validateProgressInput({ teamId: 'team123', updateText: 'Refactored backend', deltaPercentage: '50' })).toEqual({
            isValid: true
        });
        expect(validateProgressInput({ teamId: 'team123', updateText: 'Rolled back feature', deltaPercentage: -20 })).toEqual({
            isValid: true
        });
    });
});
