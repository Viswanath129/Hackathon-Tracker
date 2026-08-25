const { validateProgressInput } = require('../utils/validation');

describe('validateProgressInput', () => {
    it('returns invalid if body is missing or not an object', () => {
        expect(validateProgressInput(null)).toEqual({ isValid: false, message: 'Invalid request body' });
        expect(validateProgressInput('string')).toEqual({ isValid: false, message: 'Invalid request body' });
    });

    it('returns invalid if teamId is missing or empty', () => {
        expect(validateProgressInput({ updateText: 'Log 1', deltaPercentage: 10 })).toEqual({
            isValid: false,
            message: 'teamId must be a non-empty string'
        });
        expect(validateProgressInput({ teamId: '', updateText: 'Log 1', deltaPercentage: 10 })).toEqual({
            isValid: false,
            message: 'teamId must be a non-empty string'
        });
    });

    it('returns invalid if updateText is missing or empty', () => {
        expect(validateProgressInput({ teamId: 'proj_123', deltaPercentage: 10 })).toEqual({
            isValid: false,
            message: 'updateText must be a non-empty string'
        });
        expect(validateProgressInput({ teamId: 'proj_123', updateText: '   ', deltaPercentage: 10 })).toEqual({
            isValid: false,
            message: 'updateText must be a non-empty string'
        });
    });

    it('returns invalid if deltaPercentage is boolean', () => {
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'Log 1', deltaPercentage: true })).toEqual({
            isValid: false,
            message: 'deltaPercentage must be a numeric value'
        });
    });

    it('returns invalid if deltaPercentage is outside [-100, 100]', () => {
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'Log 1', deltaPercentage: 150 })).toEqual({
            isValid: false,
            message: 'deltaPercentage must be a number between -100 and 100'
        });
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'Log 1', deltaPercentage: -101 })).toEqual({
            isValid: false,
            message: 'deltaPercentage must be a number between -100 and 100'
        });
    });

    it('returns valid for correct input payload', () => {
        expect(validateProgressInput({ teamId: 'proj_123', updateText: 'Initial Setup', deltaPercentage: 25 })).toEqual({
            isValid: true
        });
    });
});
