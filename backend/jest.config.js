const path = require('path');

module.exports = {
    rootDir: __dirname,
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    moduleDirectories: ['node_modules', path.resolve(__dirname, 'node_modules')],
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true
};
