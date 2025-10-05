/** @type {import('jest').Config} */
module.exports = {
  moduleNameMapper: {
    uuid: "<rootDir>/node_modules/uuid/dist/index.js",
    "\\.(css|scss|sass)$": "<rootDir>/test/styleMock.js",
  },
  preset: "ts-jest",
  setupFiles: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jsdom",
};
