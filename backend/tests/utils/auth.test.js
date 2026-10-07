const { checkProjectOwnership } = require('../../utils/auth');

describe('checkProjectOwnership', () => {
    test('allows ownership when user _id matches project team_id', () => {
        const user = { _id: 'team_01' };
        const project = { team_id: 'team_01' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    test('allows ownership when user email matches project email', () => {
        const user = { email: 'team@test.com' };
        const project = { email: 'team@test.com' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    test('allows ownership for admin users', () => {
        const user = { _id: 'admin_1', role: 'admin' };
        const project = { team_id: 'team_99' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    test('denies ownership when IDs do not match', () => {
        const user = { _id: 'team_01' };
        const project = { team_id: 'team_02' };
        expect(checkProjectOwnership(user, project)).toBe(false);
    });

    test('returns false when user or project is missing', () => {
        expect(checkProjectOwnership(null, {})).toBe(false);
        expect(checkProjectOwnership({}, null)).toBe(false);
    });
});
