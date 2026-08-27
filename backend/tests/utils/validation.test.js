const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    it('returns invalid if data is not an object or is missing', () => {
        expect(validateProgressInput(null)).toEqual({
            valid: false,
            message: 'Invalid or missing request body'
        });
        expect(validateProgressInput(undefined)).toEqual({
            valid: false,
            message: 'Invalid or missing request body'
        });
        expect(validateProgressInput('invalid')).toEqual({
            valid: false,
            message: 'Invalid or missing request body'
        });
    });

    it('returns invalid if teamId is not a non-empty string', () => {
        expect(validateProgressInput({ teamId: '', updateText: 'Valid text', deltaPercentage: 10 })).toEqual({
            valid: false,
            message: 'teamId must be a non-empty string'
        });
        expect(validateProgressInput({ teamId: '   ', updateText: 'Valid text', deltaPercentage: 10 })).toEqual({
            valid: false,
            message: 'teamId must be a non-empty string'
        });
        expect(validateProgressInput({ teamId: 123, updateText: 'Valid text', deltaPercentage: 10 })).toEqual({
            valid: false,
            message: 'teamId must be a non-empty string'
        });
    });

    it('returns invalid if updateText is not a non-empty string', () => {
        expect(validateProgressInput({ teamId: 'proj123', updateText: '', deltaPercentage: 10 })).toEqual({
            valid: false,
            message: 'updateText must be a non-empty string'
        });
        expect(validateProgressInput({ teamId: 'proj123', updateText: '   ', deltaPercentage: 10 })).toEqual({
            valid: false,
            message: 'updateText must be a non-empty string'
        });
    });

    it('rejects boolean values for deltaPercentage', () => {
        expect(validateProgressInput({ teamId: 'proj123', updateText: 'Update', deltaPercentage: true })).toEqual({
            valid: false,
            message: 'deltaPercentage must be a numeric value between -100 and 100'
        });
        expect(validateProgressInput({ teamId: 'proj123', updateText: 'Update', deltaPercentage: false })).toEqual({
            valid: false,
            message: 'deltaPercentage must be a numeric value between -100 and 100'
        });
    });

    it('returns invalid if deltaPercentage is out of bounds or not numeric', () => {
        expect(validateProgressInput({ teamId: 'proj123', updateText: 'Update', deltaPercentage: 150 })).toEqual({
            valid: false,
            message: 'deltaPercentage must be a numeric value between -100 and 100'
        });
        expect(validateProgressInput({ teamId: 'proj123', updateText: 'Update', deltaPercentage: -105 })).toEqual({
            valid: false,
            message: 'deltaPercentage must be a numeric value between -100 and 100'
        });
        expect(validateProgressInput({ teamId: 'proj123', updateText: 'Update', deltaPercentage: 'abc' })).toEqual({
            valid: false,
            message: 'deltaPercentage must be a numeric value between -100 and 100'
        });
    });

    it('returns valid for correct payloads', () => {
        const result = validateProgressInput({
            teamId: 'proj123',
            updateText: 'Completed module 1',
            deltaPercentage: 25
        });
        expect(result).toEqual({
            valid: true,
            data: {
                teamId: 'proj123',
                updateText: 'Completed module 1',
                deltaPercentage: 25
            }
        });
    });
});
