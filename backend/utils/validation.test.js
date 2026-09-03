const { validateProgressInput } = require('./validation');

describe('validation utility', () => {
    describe('validateProgressInput', () => {
        it('should pass for valid inputs', () => {
            const res = validateProgressInput({ teamId: 't1', updateText: 'working', deltaPercentage: 10 });
            expect(res.isValid).toBe(true);
            expect(res.error).toBeNull();
        });

        it('should reject missing teamId', () => {
            const res = validateProgressInput({ teamId: '', updateText: 'working', deltaPercentage: 10 });
            expect(res.isValid).toBe(false);
            expect(res.error).toMatch(/teamId/);
        });

        it('should reject boolean deltaPercentage', () => {
            const res = validateProgressInput({ teamId: 't1', updateText: 'working', deltaPercentage: true });
            expect(res.isValid).toBe(false);
            expect(res.error).toMatch(/deltaPercentage/);
        });

        it('should reject out-of-range deltaPercentage', () => {
            const res = validateProgressInput({ teamId: 't1', updateText: 'working', deltaPercentage: 150 });
            expect(res.isValid).toBe(false);
            expect(res.error).toMatch(/deltaPercentage/);
        });
    });
});
