const path = require('path');

module.exports = {
    testEnvironment: 'node',
    rootDir: __dirname,
    moduleDirectories: ['node_modules', path.resolve(__dirname, 'node_modules')],
    testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.spec.js'],
    verbose: true
};
