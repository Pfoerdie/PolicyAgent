/**
 * @module PolicyAgent
 * @author Simon Petrac
 */

const _ = require("./tools");
const Module = require("./Module.js");

const _package = new Module("PolicyAgent", __dirname);
module.exports = _package;

_package.define("tools", _);

require("./enforce");
require("./exec");
require("./decide");
require("./info");
require("./repo");
require("./admin");