/**
 * Policy Execution Point
 * @module PolicyAgent.PEP
 * @author Simon Petrac
 */

const
    UUID = require('uuid/v4'),
    ExpressSession = require('express-session'),
    SessionMemoryStore = require('session-memory-store')(ExpressSession),
    PolicyPoint = require('./PolicyPoint.js'),
    PDP = require('./PDP.js'),
    _enumerate = (obj, key, value) => Object.defineProperty(obj, key, { enumerable: true, value: value });

/**
 * @name _executeAction
 * @param TODO
 * @private
 * @async
 */
async function _executeAction() {
    // TODO
} // _executeAction

/**
* @name PEP
* @extends PolicyAgent.PolicyPoint
*/
class PEP extends PolicyPoint {
    /**
     * @constructs PEP
     * @param {JSON} [options={}]
     * @public
     */
    constructor(options = {}) {
        super(options);

        this.data.sessionMaxAge = 60 * 60 * 24 * 7;

        this.data.sessionStore = new SessionMemoryStore({
            expires: this.data.sessionMaxAge
        });

        this.data.decisionPoints = new Set();
        this.data.actionDefinition = new Map();
        this.data.actionCallbacks = new Map();

        this.defineAction('use', () => undefined); // TODO
        this.defineAction('transfer', () => undefined); // TODO
    } // PEP.constructor

    /**
     * Adds a PDP to resolve decision request.
     * @name PEP#connectPDP
     * @param {PolicyAgent.PDP} decisionPoint 
     */
    connectPDP(decisionPoint) {
        if (!(decisionPoint instanceof PDP))
            this.throw('connectPDP', new TypeError(`invalid argument`));
        if (this.data.decisionPoints.has(decisionPoint))
            this.throw('connectPDP', new Error(`decisionPoint already connected`));

        this.data.decisionPoints.add(decisionPoint);

        this.log('connectPDP', `${decisionPoint.toString(undefined, true)} connected`);
    } // PEP#connectPDP

    /**
     * @name PEP#request
     * @param {Session} session
     * @param {JSON} param
     * @returns {*}
     * @async
     */
    async request(session, param) {
        if (!session || typeof session !== 'object' || typeof session.id !== 'string')
            this.throw('request', new TypeError(`invalid argument`));
        if (!param || typeof param !== 'object')
            this.throw('request', new TypeError(`invalid argument`));
        if (!param['target'] || typeof param['target']['@type'] !== 'string')
            this.throw('request', new Error(`invalid target`));
        if (param['action'] && typeof param['action']['@id'] === 'string')
            param['action'] = param['action']['@id'];
        else if (typeof param['action'] !== 'string')
            this.throw('request', new Error(`invalid action`));
        if (!this.data.actionDefinition.has(param['action']))
            this.throw('request', new Error(`action unknown`));

        /* 1. - create RequestContext */

        const
            /** @type {PolicyAgent~RequestContext} */
            requestContext = Object.create({}, {
                '@type': { enumerable: true, value: "RequestContext" },
                '@id': { enumerable: true, value: UUID() },
                'requests': { enumerable: true, value: {} }
            });

        /* 1.1. - add default subjects */

        _enumerate(requestContext, 'target', param['target']);
        if (param['assigner'] && typeof param['assigner']['@type'] === 'string')
            _enumerate(requestContext, 'assigner', param['assigner']);
        if (param['assignee'] && typeof param['assignee']['@type'] === 'string')
            _enumerate(requestContext, 'assignee', param['assignee']);

        /* 1.2. - add action requests */

        const addRequest = (action, param) => {
            const
                requestID = `${action}-${UUID()}`,
                actionDefinition = this.data.actionDefinition.get(action),
                request = Object.create({}, { '@id': { enumerable: true, value: requestID } });

            _enumerate(request, 'action', actionDefinition.action);

            if (actionDefinition.target && param[actionDefinition.target] && typeof param[actionDefinition.target]['@type'] === 'string')
                _enumerate(request, 'target', param[actionDefinition.target]);
            if (actionDefinition.assigner && param[actionDefinition.assigner] && typeof param[actionDefinition.assigner]['@type'] === 'string')
                _enumerate(request, 'assigner', param[actionDefinition.assigner]);
            if (actionDefinition.assignee && param[actionDefinition.assignee] && typeof param[actionDefinition.assignee]['@type'] === 'string')
                _enumerate(request, 'assignee', param[actionDefinition.assignee]);

            _enumerate(requestContext['requests'], requestID, request);

            if (actionDefinition.includedIn)
                addRequest(actionDefinition.includedIn, undefined);

            actionDefinition.implies.forEach(impl => addRequest(impl, undefined));
        };

        addRequest(param['action']);

        /* 2. - send RequestContext to PDP#_requestDecision */

        let
            promiseArr = [],
            responseContexts = [];

        this.data.decisionPoints.forEach(decisionPoint => promiseArr.push(
            (async () => {
                try {
                    responseContexts.push(
                        /** @type {PolicyAgent.Context.Response} */
                        await decisionPoint._requestDecision(requestContext)
                    );
                } catch (err) {
                    // do nothing
                    console.error(err);
                }
            })(/* NOTE async call instead of promise */)
        ));

        await Promise.all(promiseArr);

        /* 3. - choose ResponseContext */

        if (responseContexts.length === 0)
            this.throw('request', new Error(`failed to resolve`));

        // TODO

        return 0;

    } // PEP#request

    /**
     * @name PEP#defineAction
     * @param {string} actionName 
     * @param {string} includedIn 
     * @param {string[]} [implies=[]] 
     * @param {function} callback 
     */
    defineAction(actionName, callback, includedIn, implies = [], target = undefined, assigner = undefined, assignee = undefined) {
        if (!actionName || typeof actionName !== 'string')
            this.throw('defineAction', new TypeError(`invalid argument`));
        if (typeof callback !== 'function')
            this.throw('defineAction', new TypeError(`invalid argument`));
        if (this.data.actionDefinition.has(actionName))
            this.throw('defineAction', new Error(`'${actionName}' already defined`));
        if (actionName === 'use' || actionName === 'transfer') {
            includedIn = undefined;
            implies = [];
        } else if (!includedIn || typeof includedIn !== 'string')
            this.throw('defineAction', new TypeError(`invalid argument`));
        if (!Array.isArray(implies) || implies.some(elem => typeof elem !== 'string'))
            this.throw('defineAction', new TypeError(`invalid argument`));
        if (includedIn && !this.data.actionDefinition.has(includedIn))
            this.throw('defineAction', new Error(`includedIn unknown`));
        if (!implies.every(elem => this.data.actionDefinition.has(elem)))
            this.throw('defineAction', new Error(`implies unknown`));
        if (target && typeof target['@type'] !== 'string')
            this.throw('defineAction', new Error(`invalid target`));
        if (assigner && typeof assigner['@type'] !== 'string')
            this.throw('defineAction', new Error(`invalid assigner`));
        if (assignee && typeof assignee['@type'] !== 'string')
            this.throw('defineAction', new Error(`invalid assignee`));

        this.data.actionCallbacks.set(actionName, callback);
        this.data.actionDefinition.set(actionName, {
            action: actionName,
            includedIn, implies,
            target, assigner, assignee
        });

    } // PEP#defineAction

} // PEP

module.exports = PEP;