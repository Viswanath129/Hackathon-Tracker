const path = require('path');

module.exports = {
    testEnvironment: 'node',
    rootDir: path.resolve(__dirname),
    testMatch: ['<rootDir>/tests/**/*.test.js'],
    verbose: true
};
