"use strict";

/**
 * Enable server specific config identified by host name.
 * @module Feature_ConfigByHostname
 */

const path = require('path');
const Feature = require('../enum/Feature');
const Util = require('rk-utils');

const JsonConfigProvider = require('rk-config/lib/JsonConfigProvider');

module.exports = {

    /**
     * This feature is loaded at configuration stage
     * @member {string}
     */
    type: Feature.CONF,

    /**
     * Load the feature
     * @param {App} app - The cli app module object
     * @param {object} options - Options for the feature
     * @returns {Promise.<*>}
     */
    load_: async (app, options) => {
        let hostName = options.altUserForTest || Util.runCmdSync('hostname').trim();
        if (hostName === '') {
            throw new Error('Unable to read "hostname" from environment.');
        }            

        app.configLoader.provider = new JsonConfigProvider(path.join(app.configPath, app.configName + '.' + hostName + '.json'));
        return app.loadConfig_();
    }
};