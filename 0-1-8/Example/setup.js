const
    Path = require('path'),
    PolicyAgent = require("../PolicyAgent"),
    Util = require('util'),
    ChildProcess = require('child_process'),
    _exec = Util.promisify(ChildProcess.exec),
    Neo4j = require('neo4j-driver').v1,
    MongoDB = require('mongodb').MongoClient,
    _policyAgent = {},
    _delayAfterStartingNeo4j = 8e3;


async function _startNeo4jMongoDB() {
    if (/\s/.test(__dirname))
        throw new Error("Neo4j will not start, if the __dirname contains any whitespaces (currently: " + __dirname + ").");

    let
        path_neo4j = Path.join(__dirname, "neo4j-community-3.5.5"),
        path_mongoDB = Path.join(__dirname, "mongodb-win32-x86_64-2008plus-ssl-4.0.9"),
        path_mongoDB_data = Path.join(__dirname, "mongodb-win32-x86_64-2008plus-ssl-4.0.9", "data/database"),
        cmd_startNeo4j = `cd "${path_neo4j}" && cd bin && start neo4j.bat console`,
        cmd_startMongoDB = `cd "${path_mongoDB}" && start bin/mongod --dbpath="${path_mongoDB_data}"`;

    _exec(cmd_startNeo4j).finally(() => console.warn('Neo4j closed'));
    _exec(cmd_startMongoDB).finally(() => console.warn('MongoDB closed'));

    await new Promise((resolve, reject) => setTimeout(resolve, _delayAfterStartingNeo4j));
} // _startNeo4jMongoDB

async function _buildPolicyAgent() {
    _policyAgent.pip = new PolicyAgent.PIP({
        'lost': "localhost",
        'port': "27017",
        'dbName': "InformationPoint"
    }); // _policyAgent.pip

    _policyAgent.pap = new PolicyAgent.PAP({
        'host': "localhost",
        'port': "7687",
        'user': "neo4j",
        'password': "neo4j"
    }); // _policyAgent.pap

    _policyAgent.pdp = new PolicyAgent.PDP({
        'PIP': _policyAgent.pip,
        'PAP': _policyAgent.pap
    }); // _policyAgent.pdp

    _policyAgent.pep = new PolicyAgent.PEP({
        'PDP': _policyAgent.pdp
    }); // _policyAgent.pep
} // _buildPolicyAgent

async function _initialize() {
    console.log("starting Neo4j and MongoDB ...");
    await _startNeo4jMongoDB();
    console.log("building PolicyAgent");
    await _buildPolicyAgent();
    console.log("setup finished:", _policyAgent);
    return _policyAgent;
} // _initialize


let _ready = false;
let _readyPromise = _initialize();
_readyPromise.then(() => (_ready = true));
exports.ready = (callback) => {
    if (_ready) callback(_policyAgent);
    else _readyPromise.then(callback);
};