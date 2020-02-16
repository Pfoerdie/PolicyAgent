/**
 * @module PolicyAgent.util
 * @author Simon Petrac
 */

const _package = require("..");
module.exports = _package._construct("util", __dirname);

_package.util._require("*", "./core.js");
_package.util._require("is", "./is.js");
_package.util._require("assert", "./assert.js");
_package.util._require("log", "./log.js");