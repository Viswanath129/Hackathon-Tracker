const { checkProjectOwnership } = require('../../utils/auth');

describe('checkProjectOwnership', () => {
    test('allows admin users regardless of project owner', () => {
        const user = { role: 'admin', teamId: 'admin_team' };
        const project = { teamId: 'other_team', _id: 'proj_123' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    test('allows matching teamId', () => {
        const user = { teamId: 'team_alpha' };
        const project = { teamId: 'team_alpha', _id: 'proj_1' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    test('allows matching project _id', () => {
        const user = { _id: 'proj_1' };
        const project = { _id: 'proj_1' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    test('allows matching user email', () => {
        const user = { email: 'team@example.com' };
        const project = { email: 'team@example.com' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    test('rejects non-matching teamId / user (BOLA protection)', () => {
        const user = { teamId: 'team_alpha', email: 'alpha@example.com' };
        const project = { teamId: 'team_beta', email: 'beta@example.com' };
        expect(checkProjectOwnership(user, project)).toBe(false);
    });

    test('rejects missing user or project', () => {
        expect(checkProjectOwnership(null, { teamId: 'team1' })).toBe(false);
        expect(checkProjectOwnership({ teamId: 'team1' }, null)).toBe(false);
    });
});
