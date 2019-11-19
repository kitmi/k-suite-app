"use strict";

/**
 * Reset process environment variables
 * @module Feature_ProcessEnv
 */

const Feature = require('../enum/Feature');

const { _ } = require('rk-utils');

module.exports = {

    /**
     * This feature is loaded at init stage
     * @member {string}
     */
    type: Feature.INIT,

    /**
     * Load the feature
     * @param {App} app - The cli app module object
     * @param {object} settings - Customized settings
     * @returns {Promise.<*>}
     */
    load_: function (app, variables) {
        _.forOwn(variables, (v, k) => {
            process.env[k] = v;
        });
    }
};