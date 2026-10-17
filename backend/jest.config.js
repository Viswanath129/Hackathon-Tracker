const path = require('path');

module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  moduleDirectories: [
    path.resolve(__dirname, 'node_modules'),
    'node_modules'
  ]
};
