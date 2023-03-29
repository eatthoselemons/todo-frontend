/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  moduleNameMapper: {
    uuid: "<rootDir>/node_modules/uuid/dist/index.js",
  },
};
