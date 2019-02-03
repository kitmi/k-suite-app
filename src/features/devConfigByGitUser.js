"use strict";

/**
 * Enable developer specific config identified by git user name.
 * @module Feature_DevConfigByGitUser
 */

const path = require('path');
const Feature = require('../enum/Feature');
const { fs, runCmdSync } = require('rk-utils');

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
     * @param {string} [options.altUserForTest] - Alternative username for test purpose, if given, this feature will not get git user but use this given value instead
     * @returns {Promise.<*>}
     */
    load_: async (app, options) => {
        let devName;
        
        try {
            devName = options.altUserForTest || runCmdSync('git config --global user.email').trim();            
        } catch (error) {

        }

        if (devName === '') {
            app.log('warn', 'Unable to read "user.email" of git config.');
            return;
        }            

        devName = devName.substr(0, devName.indexOf('@'));

        const devConfigFile = path.join(app.configPath, app.configName + '.' + devName + '.json');
        if (fs.existsSync(devConfigFile)) {
            app.configLoader.provider = new JsonConfigProvider(devConfigFile);
            await app.loadConfig_();
        }
    }
};