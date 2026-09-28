const { checkProjectOwnership } = require('../../utils/auth');

describe('checkProjectOwnership', () => {
    test('should allow admin user', () => {
        const user = { role: 'admin', email: 'admin@example.com' };
        expect(checkProjectOwnership(user, 'proj_123')).toBe(true);
    });

    test('should return false if user is null or undefined', () => {
        expect(checkProjectOwnership(null, 'proj_123')).toBe(false);
    });

    test('should allow user with matching teamId or _id string', () => {
        const user = { _id: 'proj_123', email: 'user@example.com' };
        expect(checkProjectOwnership(user, 'proj_123')).toBe(true);

        const user2 = { teamId: 'proj_456' };
        expect(checkProjectOwnership(user2, 'proj_456')).toBe(true);
    });

    test('should allow user with matching ownerEmail or email on project object', () => {
        const user = { email: 'team@example.com' };
        const project = { _id: 'proj_999', ownerEmail: 'team@example.com' };
        expect(checkProjectOwnership(user, project)).toBe(true);
    });

    test('should reject user when IDs or emails do not strictly match', () => {
        const user = { _id: 'proj_123', email: 'user1@example.com' };
        expect(checkProjectOwnership(user, 'proj_12345')).toBe(false);

        const project = { _id: 'proj_999', ownerEmail: 'other@example.com' };
        expect(checkProjectOwnership(user, project)).toBe(false);
    });
});
