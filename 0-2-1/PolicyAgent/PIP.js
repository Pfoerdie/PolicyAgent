const
    Assert = require('assert'),
    Context = require("./Context.js"),
    PRP = require("./PRP.js"),
    T = require("./tools.js"),
    PIP = {};

T.define(PIP, '_cacheEntities', function (context) {
    Assert(context instanceof Context, "invalid context");
    Assert.equal(this.phase, 'cache_entities');
    // TODO
}); // PIP._cacheEntities

module.exports = PIP;