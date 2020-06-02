const { util: _ } = _package = require("..");
module.exports = define;

_.private(_package.exec, {
    actionMap: new Map([
        ["use", async function (...args) {
            console.log(`use.call(${this}, ${args.join(", ")})`);
        }]
    ])
});

/**
 * @function exec.define
 * @param {string} id
 * @param {function} callback
 * @returns {undefined}
 * @public
 */
function define(id, callback) {
    _.log(_package.exec, "define", id, callback);
    _.assert.string(id, 1);
    _.assert(id !== "use" && id !== "transfer", "use and transfer are reserved actions");
    _.assert.function(callback);
    const { actionMap } = _.private(_package.exec);
    _.assert(!actionMap.has(id), "id already used");
    actionMap.set(id, callback);
}