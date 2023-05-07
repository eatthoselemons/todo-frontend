const PouchDB = require("pouchdb");

global.setImmediate = require("timers").setImmediate;

PouchDB.plugin(require("pouchdb-adapter-memory"));
