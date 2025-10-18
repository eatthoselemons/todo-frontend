/** @type {import('jest').Config} */
module.exports = {
  moduleNameMapper: {
    uuid: "<rootDir>/node_modules/uuid/dist/index.js",
    "\\.(css|scss|sass)$": "<rootDir>/src/shared/testing/styleMock.js",
    "^emittery$": "<rootDir>/src/shared/testing/__mocks__/emittery.js",
  },
  preset: "ts-jest",
  setupFiles: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jsdom",
};
