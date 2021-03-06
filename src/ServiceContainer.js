"use strict";

const Util = require('rk-utils');
const ConfigLoader = require('rk-config');
const JsonConfigProvider = require('rk-config/lib/JsonConfigProvider');
const { _, fs, Promise } = Util;
const path = require('path');
const EventEmitter = require('events');
const winston = require('winston');

const Feature = require('./enum/Feature');
const Literal = require('./enum/Literal');

/**
 * Service container class.
 * @class
 * @extends EventEmitter     
 */
class ServiceContainer extends EventEmitter {
    logError = (error) => {
        return this.log('error', error.message, _.pick(error, [ 'name', 'status', 'code', 'extraInfo', 'stack' ]));
    }

    /**     
     * @param {string} name - The name of the container instance.     
     * @param {object} [options] - Container options          
     * @property {string} [options.env] - Environment, default to process.env.NODE_ENV
     * @property {string} [options.workingPath] - App's working path, default to process.cwd()
     * @property {string} [options.configPath] - App's config path, default to "conf" under workingPath
     * @property {string} [options.configName] - App's config basename, default to "app"
     * @property {string} [options.disableEnvAwareConfig=false] - Don't use environment-aware config
     * @property {array} [options.allowedFeatures] - A list of enabled feature names
     */
    constructor(name, options) {
        super();

        /**
         * Name of the app
         * @member {object}         
         **/
        this.name = name;                

        /**
         * App options
         * @member {object}         
         */
        this.options = Object.assign({
            //... default options            
        }, options);

        /**
         * Environment flag
         * @member {string}        
         */
        this.env = this.options.env || process.env.NODE_ENV || "development";

        /**
         * Working directory of this cli app
         * @member {string}         
         */
        this.workingPath = this.options.workingPath ? path.resolve(this.options.workingPath) : process.cwd();     
        
        /**
         * Config path
         * @member {string}         
         */
        this.configPath = this.toAbsolutePath(this.options.configPath || Literal.DEFAULT_CONFIG_PATH);      
        
        /**
         * Config basename
         * @member {string}         
         */
        this.configName = this.options.configName || Literal.APP_CFG_NAME;        
    }

    /**
     * Start the container.
     * @fires ServiceContainer#configLoaded
     * @fires ServiceContainer#ready
     * @returns {Promise.<ServiceContainer>}
     */
    async start_() {            
        this._featureRegistry = {
            //firstly look up "features" under current working path, and then try the builtin features path
            '*': this._getFeatureFallbackPath()
        };
        /**
         * Loaded features, name => feature object
         * @member {object}         
         */
        this.features = {};
        /**
         * Loaded services
         * @member {object}         
         */
        this.services = {};       
        
        if (this.options.loadConfigFromOptions) {
            this.config = this.options.config;
        } else {
            /**
             * Configuration loader instance
             * @member {ConfigLoader}         
             */
            this.configLoader = this.options.disableEnvAwareConfig ? 
                new ConfigLoader(new JsonConfigProvider(path.join(this.configPath, this.configName + '.json')), this) : 
                ConfigLoader.createEnvAwareJsonLoader(this.configPath, this.configName, this.env, this);
            
            await this.loadConfig_();     
        }   

        /**
         * Config loaded event.
         * @event ServiceContainer#configLoaded
         */
        this.emit('configLoaded');

        if (_.isEmpty(this.config)) {
            throw Error('Empty configuration. Nothing to do! Config path: ' + this.configPath);
        }

        await this._loadFeatures_(); 

        /**
         * App ready
         * @event ServiceContainer#ready
         */
        this.emit('ready');

        /**
         * Flag showing the app is started or not.
         * @member {bool}
         */
        this.started = true;
        
        return this;
    }

    /**
     * Stop the container
     * @fires ServiceContainer#stopping
     * @returns {Promise.<ServiceContainer>}
     */
    async stop_() {
        let elegantStoppers = [];

        /**
         * App stopping
         * @event ServiceContainer#stopping
         */
        this.emit('stopping', elegantStoppers);

        if (elegantStoppers.length > 0) {
            await Promise.all(elegantStoppers);
        }

        this.started = false;

        delete this.services;
        delete this.features;
        delete this._featureRegistry;

        delete this.config;
        delete this.configLoader;  
    }

    /**
     * @returns {ServiceContainer}
     */
    async loadConfig_() {
        let configVariables = this._getConfigVariables();

        /**
         * App configuration
         * @member {object}         
         */
        this.config = await this.configLoader.load_(configVariables);   

        return this;
    }

    /**
     * Translate a relative path of this app module to an absolute path     
     * @param {array} args - Array of path parts
     * @returns {string}
     */
    toAbsolutePath(...args) {
        if (args.length === 0) {
            return this.workingPath;
        }       

        return path.resolve(this.workingPath, ...args);
    }

    /**
     * Register a service     
     * @param {string} name
     * @param {object} serviceObject
     * @param {boolean} override
     */
    registerService(name, serviceObject, override) {
        if (name in this.services && !override) {
            throw new Error('Service "'+ name +'" already registered!');
        }

        this.services[name] = serviceObject;
        this.log('verbose', `Service "${name}" registered.`);
        return this;
    }

    /**
     * Check whether a service exists
     * @param {*} name 
     * @returns {boolean}
     */
    hasService(name) {
        return name in this.services;
    }

    /**
     * Get a service from module hierarchy     
     * @param name
     * @returns {object}
     */
    getService(name) {
        return this.services[name];
    }

    /**
     * Check whether a feature is enabled in the app.
     * @param {string} feature 
     * @returns {bool}
     */
    enabled(feature) {
        return this.features.hasOwnProperty(feature);
    }

    /**
     * Add more or overide current feature registry
     * @param {object} registry 
     */
    addFeatureRegistry(registry) {
        // * is used as the fallback location to find a feature
        if (registry.hasOwnProperty('*')) {
            Util.putIntoBucket(this._featureRegistry, '*', registry['*']);
        }

        Object.assign(this._featureRegistry, _.omit(registry, ['*']));
    }

    /**
     * Default log method, may be override by loggers feature
     * @param {string} - Log level
     * @param {string} - Log message
     * @param {...object} - Extra meta data
     * @returns {ServiceContainer}
     */
    log(level, message, ...rest) {
        this.logger && this.logger.log(level, message, ...rest);
        return this;
    }

    _getConfigVariables() {
        return {
            'app': this,            
            'log': winston,
            'env': this.env
        };
    }

    _getFeatureFallbackPath() {
        return [ path.resolve(__dirname, Literal.FEATURES_PATH), this.toAbsolutePath(Literal.FEATURES_PATH) ];
    }
    
    /**
     * Load features
     * @private     
     * @returns {bool}
     */
    async _loadFeatures_() {       
        // run config stage separately first
        let configStageFeatures = [];        

        // load features
        _.forOwn(this.config, (featureOptions, name) => {
            if (this.options.allowedFeatures &&
                this.options.allowedFeatures.indexOf(name) === -1) {
                //skip disabled features
                return;
            }

            let feature;
            try {
                feature = this._loadFeature(name);                                
            } catch (err) {     
                console.error(err);           
            }   
            
            if (feature && feature.type === Feature.CONF) {                
                configStageFeatures.push([ name, feature.load_, featureOptions ]);
                delete this.config[name];
            }    
        });        
        
        if (configStageFeatures.length > 0) {      
            //configuration features will be overrided by newly loaded config
            configStageFeatures.forEach(([ name ]) => { delete this.config[name]; });
            
            await this._loadFeatureGroup_(configStageFeatures, Feature.CONF);

            //reload all features if any type of configuration feature exists            
            return this._loadFeatures_();
        }

        let featureGroups = {            
            [Feature.INIT]: [],            
            [Feature.SERVICE]: [],            
            [Feature.PLUGIN]: [],
            [Feature.FINAL]: []
        };

        // load features
        _.forOwn(this.config, (featureOptions, name) => {
            if (this.options.allowedFeatures &&
                this.options.allowedFeatures.indexOf(name) === -1) {
                //skip disabled features
                return;
            }

            let feature = this._loadFeature(name);

            if (!(feature.type in featureGroups)) {
                throw new Error(`Invalid feature type. Feature: ${name}, type: ${feature.type}`);
            }

            featureGroups[feature.type].push([ name, feature.load_, featureOptions ]);
        });

        return Util.eachAsync_(featureGroups, (group, level) => this._loadFeatureGroup_(group, level));
    }

    async _loadFeatureGroup_(featureGroup, groupLevel) {
        this.emit('before:' + groupLevel);
        this.log('verbose', `Loading "${groupLevel}" feature group ...`);
        await Util.eachAsync_(featureGroup, async ([ name, load_, options ]) => {             
            this.emit('before:load:' + name);
            this.log('verbose', `Loading feature "${name}" ...`);

            await load_(this, options);   
            this.features[name].loaded = true;             
            
            this.log('verbose', `Feature "${name}" loaded. [OK]`);
            this.emit('after:load:' + name);
        });
        this.log('verbose', `Finished loading "${groupLevel}" feature group. [OK]`);
        this.emit('after:' + groupLevel);
    }    

    /**
     * Load a feature object by name.
     * @private
     * @param {string} feature 
     * @returns {object}     
     */
    _loadFeature(feature) {
        let featureObject = this.features[feature];
        if (featureObject) return featureObject;

        let featurePath;

        if (this._featureRegistry.hasOwnProperty(feature)) {          
            //load by registry entry
            let loadOption = this._featureRegistry[feature];            
            
            if (Array.isArray(loadOption)) {
                if (loadOption.length === 0) {
                    throw new Error(`Invalid registry value for feature "${feature}".`);
                }

                featurePath = loadOption[0];
                featureObject = require(featurePath);

                if (loadOption.length > 1) {
                    //one module may contains more than one feature
                    featureObject = Util.getValueByPath(featureObject, loadOption[1]);
                }
            } else {
                featurePath = loadOption;
                featureObject = require(featurePath);
            }                             
        } else {
            //load by fallback paths
            let searchingPath = this._featureRegistry['*'];
    
            //reverse fallback stack
            let found = _.findLast(searchingPath, p => {
                featurePath = path.join(p, feature + '.js');
                return fs.existsSync(featurePath);
            });        

            if (!found) {
                throw new Error(`Don't know where to load feature "${feature}".`);
            }

            featureObject = require(featurePath);
        }
        
        if (!Feature.validate(featureObject)) {
            throw new Error(`Invalid feature object loaded from "${featurePath}".`);
        }

        this.features[feature] = featureObject;
        return featureObject;
    }
}

module.exports = ServiceContainer;