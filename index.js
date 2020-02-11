// Object.assign(exports, require("./src"));
const _module = require("./src");

// exports.enforce = _module.enforce;
exports.enforce = Object.assign((...args) => _module.enforce.apply(null, args), _module.enforce);
// exports.enforce = Object.assign((...args) => (enforce => Object.assign((...args) => enforce.apply(null, args), enforce))(_module.enforce.apply(null, args)), _module.enforce);
exports.exec = Object.assign({}, _module.exec);
// exports.decide = Object.assign((...args) => _module.decide.apply(null, args), _module.decide);
exports.info = Object.assign({}, _module.info);
exports.repo = Object.assign({}, _module.repo);
exports.admin = Object.assign({}, _module.admin);
Object.freeze(exports);