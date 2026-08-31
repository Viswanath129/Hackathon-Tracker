const { validateProgressInput } = require('../../utils/validation');

describe('validateProgressInput', () => {
    test('validates correct input with teamId', () => {
        const input = {
            teamId: 'team123',
            updateText: 'Implemented API endpoints',
            deltaPercentage: 25
        };
        const result = validateProgressInput(input);
        expect(result.valid).toBe(true);
        expect(result.projectId).toBe('team123');
        expect(result.updateText).toBe('Implemented API endpoints');
        expect(result.deltaPercentage).toBe(25);
    });

    test('validates correct input with projectId', () => {
        const input = {
            projectId: 'proj456',
            updateText: 'Fixed bug',
            deltaPercentage: -10
        };
        const result = validateProgressInput(input);
        expect(result.valid).toBe(true);
        expect(result.projectId).toBe('proj456');
    });

    test('rejects missing or non-object body', () => {
        expect(validateProgressInput(null).valid).toBe(false);
        expect(validateProgressInput('invalid').valid).toBe(false);
    });

    test('rejects missing or empty teamId/projectId', () => {
        const input = {
            updateText: 'Test',
            deltaPercentage: 10
        };
        expect(validateProgressInput(input).valid).toBe(false);

        const emptyInput = {
            teamId: '   ',
            updateText: 'Test',
            deltaPercentage: 10
        };
        expect(validateProgressInput(emptyInput).valid).toBe(false);
    });

    test('rejects missing or empty updateText', () => {
        const input = {
            teamId: 'team1',
            updateText: '  ',
            deltaPercentage: 10
        };
        expect(validateProgressInput(input).valid).toBe(false);
    });

    test('rejects boolean deltaPercentage', () => {
        const input = {
            teamId: 'team1',
            updateText: 'Test',
            deltaPercentage: true
        };
        const result = validateProgressInput(input);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('not a boolean');
    });

    test('rejects non-numeric deltaPercentage', () => {
        const input = {
            teamId: 'team1',
            updateText: 'Test',
            deltaPercentage: 'abc'
        };
        const result = validateProgressInput(input);
        expect(result.valid).toBe(false);
    });

    test('rejects deltaPercentage out of range (-100 to 100)', () => {
        const highInput = {
            teamId: 'team1',
            updateText: 'Test',
            deltaPercentage: 150
        };
        expect(validateProgressInput(highInput).valid).toBe(false);

        const lowInput = {
            teamId: 'team1',
            updateText: 'Test',
            deltaPercentage: -101
        };
        expect(validateProgressInput(lowInput).valid).toBe(false);
    });
});
