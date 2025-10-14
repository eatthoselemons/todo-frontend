/** @type {import('jest').Config} */
module.exports = {
  moduleNameMapper: {
    uuid: "<rootDir>/node_modules/uuid/dist/index.js",
    "\\.(css|scss|sass)$": "<rootDir>/test/styleMock.js",
    "^emittery$": "<rootDir>/test/__mocks__/emittery.js",
  },
  preset: "ts-jest",
  setupFiles: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jsdom",
};
