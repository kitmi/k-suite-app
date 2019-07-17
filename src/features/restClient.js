const { _ } = require('rk-utils');
const Feature = require('../enum/Feature');
const { tryRequire } = require('../utils/Helpers');

const AllowedMethods = {
    'get': 'get',
    'post': 'post',
    'put': 'put',
    'del': 'del',
    'delete': 'del',
    'upload': 'post',
    'download': 'get'
};

class RestClient {
    constructor(endpoint, onSendHandler) {
        this.agent = tryRequire('superagent');
        this.endpoint = endpoint.endsWith('/') ? endpoint : endpoint + '/';
        this.onSendHandler = onSendHandler;
    }

    async _sendRequest_(req) {
        if (this.onSendHandler) {
            this.onSendHandler(req);
        }

        try {
            let res = await req;
            return res.type === 'text/plain' ? res.text : (res.body || res.text);
        } catch (error) {
            if (this.onErrorHandler) {
                await this.onErrorHandler(error);
            }

            if (error.response) {
                let { status, body, text } = error.response;

                let message = (body && body.error) || (error.response.error && error.response.error.message) || text;
                error.message = message;                
                error.status = status;
            }

            throw error;
        }
    }

    async do_(method, path, query, body) {
        method = method.toLowerCase();
        let httpMethod = AllowedMethods[method];
        if (!httpMethod) {
            throw new Error('Invalid method: ' + method);
        }

        if (path[0] === '/') {
            path = path.substr(1);
        }

        let req = this.agent[httpMethod](this.endpoint + path);
        if (query) {
            req.query(query);
        }

        if (method === 'download') {
            req.responseType('blob');
        } else if (method === 'upload') {
            req.attach("file", body);
        } else if (body) {
            req.send(body);            
        }

        return this._sendRequest_(req);
    }

    async getOne_(resource, id, query) {
        return this.do_('get', encodeURIComponent(resource) + '/' + encodeURIComponent(id), query);
    }

    async getList_(resource, query) {
        return this.do_('get', encodeURIComponent(resource), query);
    }

    async create_(resource, data) {
        return this.do_('post', encodeURIComponent(resource), null, data);
    }

    async updateAny_(resource, where, data) {
        return this.do_('put', encodeURIComponent(resource), where, data);
    }

    async updateOne_(resource, id, data) {
        return this.do_('put', encodeURIComponent(resource) + '/' + encodeURIComponent(id), null, data);
    }

    async removeOne_(resource, id) {
        return this.do_('del', encodeURIComponent(resource) + '/' + encodeURIComponent(id));
    }

    async removeAny_(resource, where) {
        return this.do_('del', encodeURIComponent(resource), where);
    }

    async rpcGet_(resource, method, query) {
        return this.do_('get', '_rpc/' + encodeURIComponent(resource) + '/' + encodeURIComponent(method), query);
    }

    async rpcDownload_(resource, method, query) {
        return this.do_('download', '_rpc/' + encodeURIComponent(resource) + '/' + encodeURIComponent(method), query);
    }

    async rpcPost_(resource, method, query, body) {
        return this.do_('post', '_rpc/' + encodeURIComponent(resource) + '/' + encodeURIComponent(method), query, body);
    }

    async rpcUpload_(resource, method, query, file) {
        return this.do_('upload', '_rpc/' + encodeURIComponent(resource) + '/' + encodeURIComponent(method), query, file);
    }
}

module.exports = {

    /**
     * This feature is loaded at init stage
     * @member {string}
     */
    type: Feature.SERVICE,

    /**
     * Load the feature
     * @param {App} app - The cli app module object
     * @param {object} settings - Settings of rest clients    
     * @returns {Promise.<*>}
     */
    load_: async function (app, settings) {
        _.map(settings, (endpoint, name) => {
            let client = new RestClient(endpoint);
            app.registerService(`restClient.${name}`, client);
        });        
    }
};