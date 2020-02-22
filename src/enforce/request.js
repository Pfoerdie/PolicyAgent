const { util: _ } = package = require("..");
module.exports = request;

/**
 * @function enforce.request
 * @param {object} param 
 * @returns {Context}
 * @public
 * @async
 */
async function request(param) {
    _.log(package.enforce, "request", param);
    const context = new package.enforce.Context(param);
    const data = _.private(context);
    await package.exec.enforceActions(context);
    await package.info.enforceEntities(context);
    await package.decide.enforcePolicies(context);
    // TODO next steps
    data.env.ts_ready = _.now();
    data.ready = true;
    _.log(data);
    console.log("Context", data);
    _.log("Request time: " + (data.env.ts_ready - data.env.ts_init) + " ms");
    return context;
}