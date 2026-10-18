const path = require('path');

module.exports = {
    rootDir: __dirname,
    moduleDirectories: ['node_modules', path.resolve(__dirname, 'node_modules')],
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js']
};
