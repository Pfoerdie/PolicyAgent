/**
 * Policy Decision Point
 * @module PolicyAgent.PDP
 * @author Simon Petrac
 */

const
    PolicyPoint = require('./PolicyPoint.js'),
    Context = require('./Context.js'),
    PIP = require('./PIP.js'),
    PAP = require('./PAP.js');

/**
 * @name PDP
 * @extends PolicyAgent.PolicyPoint
 */
class PDP extends PolicyPoint {
    /**
     * @constructs PDP
     * @param {JSON} [options={}]
     * @abstract
     * @public
     */
    constructor(options = {}) {
        super(options);

        this.data.administrationPoint = null;
        this.data.informationPoint = null;

    } // PDP.constructor

    /**
     * Adds a PIP to retrieve information.
     * @name PDP#connectPIP
     * @param {PolicyAgent.PIP} informationPoint 
     */
    connectPIP(informationPoint) {
        if (!(informationPoint instanceof PIP))
            this.throw('connectPIP', new TypeError(`invalid argument`));
        if (this.data.informationPoint)
            this.throw('connectPIP', `AttributeStore already connected`);

        this.data.informationPoint = informationPoint;
        this.log('connectPIP', `${informationPoint.toString(undefined, true)} connected`);
    } // PDP#connectPIP

    /**
     * Adds a PAP to retrieve policies.
     * @name PDP#connectPAP
     * @param {PolicyAgent.PAP} administrationPoint 
     */
    connectPAP(administrationPoint) {
        if (!(administrationPoint instanceof PAP))
            this.throw('connectPAP', new TypeError(`invalid argument`));
        if (this.data.administrationPoint)
            this.throw('connectPAP', `PAP already connected`);

        this.data.administrationPoint = administrationPoint;
        this.log('connectPAP', `${administrationPoint.toString(undefined, true)} connected`);
    } // PDP#connectPAP

    /**
     * @name PDP#_requestDecision
     * @param {Context} context
     * @async
     * 
     * INFO 7.17 Authorization decision:
     *   -> The PDP MUST return a response context, with one <Decision> element of value "Permit", "Deny", "Indeterminate" or "NotApplicable".
     */
    async _requestDecision(requestContext) {
        if (!PolicyPoint.validate('PolicyAgent~RequestContext', requestContext))
            this.throw('_requestDecision', new TypeError(`invalid argument`));

        if (!this.data.informationPoint)
            this.throw('_requestDecision', new Error(`informationPoint not connected`));
        if (!this.data.administrationPoint)
            this.throw('_requestDecision', new Error(`administrationPoint not connected`));

        /**
         * @typedef {JSON} PDP~Response
         * @property {string} @type="PDP~Response"
         * @property {PolicyAgent.PEP~Request#@id} @id
         * @property {ODRL.Action#id} action
         * @property {ODRL.Action#refinement} [refinement]
         * @property {object} [environment]
         * @property {ODRL.Action#id} [includedIn]
         * @property {ODRL.Action#id[]} [implies]
         * @property {ODRL.Asset#uid} target
         * @property {ODRL.Party#uid} [assignee]
         * @property {ODRL.Party#uid} [assigner]
         * 
         * @typedef {JSON} PDP~Resource
         * @property {string} @type="PDP~Resource"
         * @property {PolicyAgent.PIP~Subject#uid} @id
         * @property {PolicyAgent.PIP~Subject} subject
         * @property {PolicyAgent.PIP~Resource} resource
         * @property {PolicyAgent.PIP#id} @source
         */

        let
            /** @type {Map<string, (PolicyAgent.PEP~Request|PolicyAgent.PEP~Subject)>} Contains all data of the request. */
            requestMap = new Map(requestContext['@graph'].map(elem => [elem['@id'], elem])),
            /** @type {Map<string, (PDP~Response|PDP~Resource)>} Contains all data of the response. */
            responseMap = new Map(),
            /** @type {Array<PolicyAgent.PEP~Subject>} This array is used to require the subjects from the PIP. */
            requestSubjects = [],
            /** @type {Array<Array<[PolicyAgent.PEP~Request#id, string]>>} Required to coordinate the subjects for each request. */
            indexMatching = [];

        requestMap.forEach((entry, id) => {
            if (entry['@type'] === 'PEP~Request') {
                const response = {
                    '@type': "PDP~Response",
                    '@id': id,
                    'action': entry['action']
                };

                for (let name of ['target', 'assigner', 'assignee']) {
                    /** @type {PolicyAgent.PEP~Subject} */
                    let subject = typeof entry[name] === 'string'
                        ? requestMap[entry[name]]
                        : entry[name];

                    if (subject && subject['@type'] !== "PEP~Request") {
                        let tmpIndex = requestSubjects.findIndex(elem => elem === subject || (elem['@id'] && elem['@id'] === subject['@id']));

                        if (tmpIndex < 0) {
                            requestSubjects.push(subject);
                            indexMatching.push([[id, name]]);
                        } else {
                            indexMatching[tmpIndex].push([id, name]);
                        }
                    }
                } // for

                responseMap.set(id, response);
            }
        });

        /** @type {Array<PolicyAgent.PIP~Subject>} This array contains all subjects found that were included in the requests. */
        let responseSubjects = await this.data.informationPoint._retrieveSubjects(requestSubjects);

        indexMatching.forEach((matching, index) => {
            /** @type {PolicyAgent.PIP~Subject} */
            let subject = responseSubjects[index];

            if (!subject || !subject['uid']) return;

            if (!responseMap.has(subject['uid'])) {
                responseMap.set(subject['uid'], {
                    '@type': match[1] === 'target' ? 'Asset' : 'Party',
                    '@id': subject['uid'],
                    'subject': subject,
                    '@source': this.data.informationPoint.id
                });
            }

            matching.forEach(([id, name]) => {
                responseMap.get(id)[name] = subject['uid'];
            });
        });

        // TODO

        return {
            '@context': "PolicyAgent~ResponseContext",
            '@graph': responseMap.entries().map(entry => entry[1])
        };

    } // PDP#_requestDecision

    /**
     * TODO
     */
    async _finalizeRequest(responseContext) {
        // TODO
    } // PDP#_finalizeRequest

} // PDP

module.exports = PDP;