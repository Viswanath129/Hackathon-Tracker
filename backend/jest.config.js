const path = require('path');

module.exports = {
    rootDir: __dirname,
    testEnvironment: 'node',
    moduleDirectories: ['node_modules', path.resolve(__dirname, 'node_modules')]
};
