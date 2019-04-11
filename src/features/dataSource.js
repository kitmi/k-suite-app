"use strict";

/**
 * Enable data source feature
 * @module Feature_DataSource
 */

const { _ } = require('rk-utils');
const { tryRequire } = require('../utils/Helpers');
const Feature = require('../enum/Feature');
const { InvalidConfiguration } = require('../utils/Errors');

module.exports = {
    /**
     * This feature is loaded at service stage
     * @member {string}
     */
    type: Feature.SERVICE,

    /**
     * Load the feature
     * @param {ServiceContainer} app - The app module object
     * @param {object} dataSources - Datasource settings
     * @returns {Promise.<*>}
     */
    load_: async (app, dataSources) => {
        const { Connector } = tryRequire('@k-suite/oolong');

        _.forOwn(dataSources, (dataSource, dbms) => {
            _.forOwn(dataSource, (config, connectorName) => {
                let serviceName = dbms + '.' + connectorName;

                if (!config.connection) {
                    throw new InvalidConfiguration(
                        `Missing connection config for data source "${serviceName}".`,
                        app,
                        `dataSource.${dbms}.${connectorName}`
                    );
                }
                
                let { connection: connectionString, ...other } = config;  
                
                let connectorService = Connector.createConnector(dbms, connectionString, { logger: app.server ? app.server.logger : app.logger, ...other });
                app.registerService(serviceName, connectorService);

                app.on('stopping', () => {
                    connectorService.end_().then();
                });
            });            
        });        
    }
};