"use strict";

require("source-map-support/register");

const Util = require('rk-utils');

const ConfigLoader = require('rk-config');

const JsonConfigProvider = require('rk-config/lib/JsonConfigProvider');

const {
  _,
  fs,
  Promise
} = Util;

const path = require('path');

const EventEmitter = require('events');

const winston = require('winston');

const Feature = require('./enum/Feature');

const Literal = require('./enum/Literal');

class ServiceContainer extends EventEmitter {
  constructor(name, options) {
    super();

    this.logError = error => {
      return this.log('error', error.message, _.pick(error, ['name', 'status', 'code', 'extraInfo', 'stack']));
    };

    this.name = name;
    this.options = Object.assign({}, options);
    this.env = this.options.env || process.env.NODE_ENV || "development";
    this.workingPath = this.options.workingPath ? path.resolve(this.options.workingPath) : process.cwd();
    this.configPath = this.toAbsolutePath(this.options.configPath || Literal.DEFAULT_CONFIG_PATH);
    this.configName = this.options.configName || Literal.APP_CFG_NAME;
  }

  async start_() {
    this._featureRegistry = {
      '*': this._getFeatureFallbackPath()
    };
    this.features = {};
    this.services = {};

    if (this.options.loadConfigFromOptions) {
      this.config = this.options.config;
    } else {
      this.configLoader = this.options.disableEnvAwareConfig ? new ConfigLoader(new JsonConfigProvider(path.join(this.configPath, this.configName + '.json')), this) : ConfigLoader.createEnvAwareJsonLoader(this.configPath, this.configName, this.env, this);
      await this.loadConfig_();
    }

    this.emit('configLoaded');

    if (_.isEmpty(this.config)) {
      throw Error('Empty configuration. Nothing to do! Config path: ' + this.configPath);
    }

    await this._loadFeatures_();
    this.emit('ready');
    this.started = true;
    return this;
  }

  async stop_() {
    let elegantStoppers = [];
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

  async loadConfig_() {
    let configVariables = this._getConfigVariables();

    this.config = await this.configLoader.load_(configVariables);
    return this;
  }

  toAbsolutePath(...args) {
    if (args.length === 0) {
      return this.workingPath;
    }

    return path.resolve(this.workingPath, ...args);
  }

  registerService(name, serviceObject, override) {
    if (name in this.services && !override) {
      throw new Error('Service "' + name + '" already registered!');
    }

    this.services[name] = serviceObject;
    this.log('verbose', `Service "${name}" registered.`);
    return this;
  }

  hasService(name) {
    return name in this.services;
  }

  getService(name) {
    return this.services[name];
  }

  enabled(feature) {
    return this.features.hasOwnProperty(feature);
  }

  addFeatureRegistry(registry) {
    if (registry.hasOwnProperty('*')) {
      Util.putIntoBucket(this._featureRegistry, '*', registry['*']);
    }

    Object.assign(this._featureRegistry, _.omit(registry, ['*']));
  }

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
    return [path.resolve(__dirname, Literal.FEATURES_PATH), this.toAbsolutePath(Literal.FEATURES_PATH)];
  }

  async _loadFeatures_() {
    let configStageFeatures = [];

    _.forOwn(this.config, (featureOptions, name) => {
      if (this.options.allowedFeatures && this.options.allowedFeatures.indexOf(name) === -1) {
        return;
      }

      let feature;

      try {
        feature = this._loadFeature(name);
      } catch (err) {
        console.error(err);
      }

      if (feature && feature.type === Feature.CONF) {
        configStageFeatures.push([name, feature.load_, featureOptions]);
        delete this.config[name];
      }
    });

    if (configStageFeatures.length > 0) {
      configStageFeatures.forEach(([name]) => {
        delete this.config[name];
      });
      await this._loadFeatureGroup_(configStageFeatures, Feature.CONF);
      return this._loadFeatures_();
    }

    let featureGroups = {
      [Feature.INIT]: [],
      [Feature.SERVICE]: [],
      [Feature.PLUGIN]: [],
      [Feature.FINAL]: []
    };

    _.forOwn(this.config, (featureOptions, name) => {
      if (this.options.allowedFeatures && this.options.allowedFeatures.indexOf(name) === -1) {
        return;
      }

      let feature = this._loadFeature(name);

      if (!(feature.type in featureGroups)) {
        throw new Error(`Invalid feature type. Feature: ${name}, type: ${feature.type}`);
      }

      featureGroups[feature.type].push([name, feature.load_, featureOptions]);
    });

    return Util.eachAsync_(featureGroups, (group, level) => this._loadFeatureGroup_(group, level));
  }

  async _loadFeatureGroup_(featureGroup, groupLevel) {
    this.emit('before:' + groupLevel);
    this.log('verbose', `Loading "${groupLevel}" feature group ...`);
    await Util.eachAsync_(featureGroup, async ([name, load_, options]) => {
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

  _loadFeature(feature) {
    let featureObject = this.features[feature];
    if (featureObject) return featureObject;
    let featurePath;

    if (this._featureRegistry.hasOwnProperty(feature)) {
      let loadOption = this._featureRegistry[feature];

      if (Array.isArray(loadOption)) {
        if (loadOption.length === 0) {
          throw new Error(`Invalid registry value for feature "${feature}".`);
        }

        featurePath = loadOption[0];
        featureObject = require(featurePath);

        if (loadOption.length > 1) {
          featureObject = Util.getValueByPath(featureObject, loadOption[1]);
        }
      } else {
        featurePath = loadOption;
        featureObject = require(featurePath);
      }
    } else {
      let searchingPath = this._featureRegistry['*'];

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9TZXJ2aWNlQ29udGFpbmVyLmpzIl0sIm5hbWVzIjpbIlV0aWwiLCJyZXF1aXJlIiwiQ29uZmlnTG9hZGVyIiwiSnNvbkNvbmZpZ1Byb3ZpZGVyIiwiXyIsImZzIiwiUHJvbWlzZSIsInBhdGgiLCJFdmVudEVtaXR0ZXIiLCJ3aW5zdG9uIiwiRmVhdHVyZSIsIkxpdGVyYWwiLCJTZXJ2aWNlQ29udGFpbmVyIiwiY29uc3RydWN0b3IiLCJuYW1lIiwib3B0aW9ucyIsImxvZ0Vycm9yIiwiZXJyb3IiLCJsb2ciLCJtZXNzYWdlIiwicGljayIsIk9iamVjdCIsImFzc2lnbiIsImVudiIsInByb2Nlc3MiLCJOT0RFX0VOViIsIndvcmtpbmdQYXRoIiwicmVzb2x2ZSIsImN3ZCIsImNvbmZpZ1BhdGgiLCJ0b0Fic29sdXRlUGF0aCIsIkRFRkFVTFRfQ09ORklHX1BBVEgiLCJjb25maWdOYW1lIiwiQVBQX0NGR19OQU1FIiwic3RhcnRfIiwiX2ZlYXR1cmVSZWdpc3RyeSIsIl9nZXRGZWF0dXJlRmFsbGJhY2tQYXRoIiwiZmVhdHVyZXMiLCJzZXJ2aWNlcyIsImxvYWRDb25maWdGcm9tT3B0aW9ucyIsImNvbmZpZyIsImNvbmZpZ0xvYWRlciIsImRpc2FibGVFbnZBd2FyZUNvbmZpZyIsImpvaW4iLCJjcmVhdGVFbnZBd2FyZUpzb25Mb2FkZXIiLCJsb2FkQ29uZmlnXyIsImVtaXQiLCJpc0VtcHR5IiwiRXJyb3IiLCJfbG9hZEZlYXR1cmVzXyIsInN0YXJ0ZWQiLCJzdG9wXyIsImVsZWdhbnRTdG9wcGVycyIsImxlbmd0aCIsImFsbCIsImNvbmZpZ1ZhcmlhYmxlcyIsIl9nZXRDb25maWdWYXJpYWJsZXMiLCJsb2FkXyIsImFyZ3MiLCJyZWdpc3RlclNlcnZpY2UiLCJzZXJ2aWNlT2JqZWN0Iiwib3ZlcnJpZGUiLCJoYXNTZXJ2aWNlIiwiZ2V0U2VydmljZSIsImVuYWJsZWQiLCJmZWF0dXJlIiwiaGFzT3duUHJvcGVydHkiLCJhZGRGZWF0dXJlUmVnaXN0cnkiLCJyZWdpc3RyeSIsInB1dEludG9CdWNrZXQiLCJvbWl0IiwibGV2ZWwiLCJyZXN0IiwibG9nZ2VyIiwiX19kaXJuYW1lIiwiRkVBVFVSRVNfUEFUSCIsImNvbmZpZ1N0YWdlRmVhdHVyZXMiLCJmb3JPd24iLCJmZWF0dXJlT3B0aW9ucyIsImFsbG93ZWRGZWF0dXJlcyIsImluZGV4T2YiLCJfbG9hZEZlYXR1cmUiLCJlcnIiLCJjb25zb2xlIiwidHlwZSIsIkNPTkYiLCJwdXNoIiwiZm9yRWFjaCIsIl9sb2FkRmVhdHVyZUdyb3VwXyIsImZlYXR1cmVHcm91cHMiLCJJTklUIiwiU0VSVklDRSIsIlBMVUdJTiIsIkZJTkFMIiwiZWFjaEFzeW5jXyIsImdyb3VwIiwiZmVhdHVyZUdyb3VwIiwiZ3JvdXBMZXZlbCIsImxvYWRlZCIsImZlYXR1cmVPYmplY3QiLCJmZWF0dXJlUGF0aCIsImxvYWRPcHRpb24iLCJBcnJheSIsImlzQXJyYXkiLCJnZXRWYWx1ZUJ5UGF0aCIsInNlYXJjaGluZ1BhdGgiLCJmb3VuZCIsImZpbmRMYXN0IiwicCIsImV4aXN0c1N5bmMiLCJ2YWxpZGF0ZSIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiJBQUFBOzs7O0FBRUEsTUFBTUEsSUFBSSxHQUFHQyxPQUFPLENBQUMsVUFBRCxDQUFwQjs7QUFDQSxNQUFNQyxZQUFZLEdBQUdELE9BQU8sQ0FBQyxXQUFELENBQTVCOztBQUNBLE1BQU1FLGtCQUFrQixHQUFHRixPQUFPLENBQUMsa0NBQUQsQ0FBbEM7O0FBQ0EsTUFBTTtBQUFFRyxFQUFBQSxDQUFGO0FBQUtDLEVBQUFBLEVBQUw7QUFBU0MsRUFBQUE7QUFBVCxJQUFxQk4sSUFBM0I7O0FBQ0EsTUFBTU8sSUFBSSxHQUFHTixPQUFPLENBQUMsTUFBRCxDQUFwQjs7QUFDQSxNQUFNTyxZQUFZLEdBQUdQLE9BQU8sQ0FBQyxRQUFELENBQTVCOztBQUNBLE1BQU1RLE9BQU8sR0FBR1IsT0FBTyxDQUFDLFNBQUQsQ0FBdkI7O0FBRUEsTUFBTVMsT0FBTyxH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TyxDQUFDb0csUUFBUixDQUFpQlgsYUFBakIsQ0FBTCxFQUFzQztBQUNsQyxZQUFNLElBQUluRCxLQUFKLENBQVcsdUNBQXNDb0QsV0FBWSxJQUE3RCxDQUFOO0FBQ0g7O0FBRUQsU0FBSy9ELFFBQUwsQ0FBYzRCLE9BQWQsSUFBeUJrQyxhQUF6QjtBQUNBLFdBQU9BLGFBQVA7QUFDSDs7QUEzWXVDOztBQThZNUNZLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQnBHLGdCQUFqQiIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuXG5jb25zdCBVdGlsID0gcmVxdWlyZSgncmstdXRpbHMnKTtcbmNvbnN0IENvbmZpZ0xvYWRlciA9IHJlcXVpcmUoJ3JrLWNvbmZpZycpO1xuY29uc3QgSnNvbkNvbmZpZ1Byb3ZpZGVyID0gcmVxdWlyZSgncmstY29uZmlnL2xpYi9Kc29uQ29uZmlnUHJvdmlkZXInKTtcbmNvbnN0IHsgXywgZnMsIFByb21pc2UgfSA9IFV0aWw7XG5jb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuY29uc3QgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJyk7XG5jb25zdCB3aW5zdG9uID0gcmVxdWlyZSgnd2luc3RvbicpO1xuXG5jb25zdCBGZWF0dXJlID0gcmVxdWlyZSgnLi9lbnVtL0ZlYXR1cmUnKTtcbmNvbnN0IExpdGVyYWwgPSByZXF1aXJlKCcuL2VudW0vTGl0ZXJhbCcpO1xuXG4vKipcbiAqIFNlcnZpY2UgY29udGFpbmVyIGNsYXNzLlxuICogQGNsYXNzXG4gKiBAZXh0ZW5kcyBFdmVudEVtaXR0ZXIgICAgIFxuICovXG5jbGFzcyBTZXJ2aWNlQ29udGFpbmVyIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgICBsb2dFcnJvciA9IChlcnJvcikgPT4ge1xuICAgICAgICByZXR1cm4gdGhpcy5sb2coJ2Vycm9yJywgZXJyb3IubWVzc2FnZSwgXy5waWNrKGVycm9yLCBbICduYW1lJywgJ3N0YXR1cycsICdjb2RlJywgJ2V4dHJhSW5mbycsICdzdGFjaycgXSkpO1xuICAgIH1cblxuICAgIC8qKiAgICAgXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgY29udGFpbmVyIGluc3RhbmNlLiAgICAgXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zXSAtIENvbnRhaW5lciBvcHRpb25zICAgICAgICAgIFxuICAgICAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBbb3B0aW9ucy5lbnZdIC0gRW52aXJvbm1lbnQsIGRlZmF1bHQgdG8gcHJvY2Vzcy5lbnYuTk9ERV9FTlZcbiAgICAgKiBAcHJvcGVydHkge3N0cmluZ30gW29wdGlvbnMud29ya2luZ1BhdGhdIC0gQXBwJ3Mgd29ya2luZyBwYXRoLCBkZWZhdWx0IHRvIHByb2Nlc3MuY3dkKClcbiAgICAgKiBAcHJvcGVydHkge3N0cmluZ30gW29wdGlvbnMuY29uZmlnUGF0aF0gLSBBcHAncyBjb25maWcgcGF0aCwgZGVmYXVsdCB0byBcImNvbmZcIiB1bmRlciB3b3JraW5nUGF0aFxuICAgICAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBbb3B0aW9ucy5jb25maWdOYW1lXSAtIEFwcCdzIGNvbmZpZyBiYXNlbmFtZSwgZGVmYXVsdCB0byBcImFwcFwiXG4gICAgICogQHByb3BlcnR5IHtzdHJpbmd9IFtvcHRpb25zLmRpc2FibGVFbnZBd2FyZUNvbmZpZz1mYWxzZV0gLSBEb24ndCB1c2UgZW52aXJvbm1lbnQtYXdhcmUgY29uZmlnXG4gICAgICogQHByb3BlcnR5IHthcnJheX0gW29wdGlvbnMuYWxsb3dlZEZlYXR1cmVzXSAtIEEgbGlzdCBvZiBlbmFibGVkIGZlYXR1cmUgbmFtZXNcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihuYW1lLCBvcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKCk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIE5hbWUgb2YgdGhlIGFwcFxuICAgICAgICAgKiBAbWVtYmVyIHtvYmplY3R9ICAgICAgICAgXG4gICAgICAgICAqKi9cbiAgICAgICAgdGhpcy5uYW1lID0gbmFtZTsgICAgICAgICAgICAgICAgXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFwcCBvcHRpb25zXG4gICAgICAgICAqIEBtZW1iZXIge29iamVjdH0gICAgICAgICBcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMub3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe1xuICAgICAgICAgICAgLy8uLi4gZGVmYXVsdCBvcHRpb25zICAgICAgICAgICAgXG4gICAgICAgIH0sIG9wdGlvbnMpO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbnZpcm9ubWVudCBmbGFnXG4gICAgICAgICAqIEBtZW1iZXIge3N0cmluZ30gICAgICAgIFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5lbnYgPSB0aGlzLm9wdGlvbnMuZW52IHx8IHByb2Nlc3MuZW52Lk5PREVfRU5WIHx8IFwiZGV2ZWxvcG1lbnRcIjtcblxuICAgICAgICAvKipcbiAgICAgICAgICogV29ya2luZyBkaXJlY3Rvcnkgb2YgdGhpcyBjbGkgYXBwXG4gICAgICAgICAqIEBtZW1iZXIge3N0cmluZ30gICAgICAgICBcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMud29ya2luZ1BhdGggPSB0aGlzLm9wdGlvbnMud29ya2luZ1BhdGggPyBwYXRoLnJlc29sdmUodGhpcy5vcHRpb25zLndvcmtpbmdQYXRoKSA6IHByb2Nlc3MuY3dkKCk7ICAgICBcbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb25maWcgcGF0aFxuICAgICAgICAgKiBAbWVtYmVyIHtzdHJpbmd9ICAgICAgICAgXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmNvbmZpZ1BhdGggPSB0aGlzLnRvQWJzb2x1dGVQYXRoKHRoaXMub3B0aW9ucy5jb25maWdQYXRoIHx8IExpdGVyYWwuREVGQVVMVF9DT05GSUdfUEFUSCk7ICAgICAgXG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogQ29uZmlnIGJhc2VuYW1lXG4gICAgICAgICAqIEBtZW1iZXIge3N0cmluZ30gICAgICAgICBcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuY29uZmlnTmFtZSA9IHRoaXMub3B0aW9ucy5jb25maWdOYW1lIHx8IExpdGVyYWwuQVBQX0NGR19OQU1FOyAgICAgICAgXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU3RhcnQgdGhlIGNvbnRhaW5lci5cbiAgICAgKiBAZmlyZXMgU2VydmljZUNvbnRhaW5lciNjb25maWdMb2FkZWRcbiAgICAgKiBAZmlyZXMgU2VydmljZUNvbnRhaW5lciNyZWFkeVxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlLjxTZXJ2aWNlQ29udGFpbmVyPn1cbiAgICAgKi9cbiAgICBhc3luYyBzdGFydF8oKSB7ICAgICAgICAgICAgXG4gICAgICAgIHRoaXMuX2ZlYXR1cmVSZWdpc3RyeSA9IHtcbiAgICAgICAgICAgIC8vZmlyc3RseSBsb29rIHVwIFwiZmVhdHVyZXNcIiB1bmRlciBjdXJyZW50IHdvcmtpbmcgcGF0aCwgYW5kIHRoZW4gdHJ5IHRoZSBidWlsdGluIGZlYXR1cmVzIHBhdGhcbiAgICAgICAgICAgICcqJzogdGhpcy5fZ2V0RmVhdHVyZUZhbGxiYWNrUGF0aCgpXG4gICAgICAgIH07XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBMb2FkZWQgZmVhdHVyZXMsIG5hbWUgPT4gZmVhdHVyZSBvYmplY3RcbiAgICAgICAgICogQG1lbWJlciB7b2JqZWN0fSAgICAgICAgIFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5mZWF0dXJlcyA9IHt9O1xuICAgICAgICAvKipcbiAgICAgICAgICogTG9hZGVkIHNlcnZpY2VzXG4gICAgICAgICAqIEBtZW1iZXIge29iamVjdH0gICAgICAgICBcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc2VydmljZXMgPSB7fTsgICAgICAgXG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmxvYWRDb25maWdGcm9tT3B0aW9ucykge1xuICAgICAgICAgICAgdGhpcy5jb25maWcgPSB0aGlzLm9wdGlvbnMuY29uZmlnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb25maWd1cmF0aW9uIGxvYWRlciBpbnN0YW5jZVxuICAgICAgICAgICAgICogQG1lbWJlciB7Q29uZmlnTG9hZGVyfSAgICAgICAgIFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLmNvbmZpZ0xvYWRlciA9IHRoaXMub3B0aW9ucy5kaXNhYmxlRW52QXdhcmVDb25maWcgPyBcbiAgICAgICAgICAgICAgICBuZXcgQ29uZmlnTG9hZGVyKG5ldyBKc29uQ29uZmlnUHJvdmlkZXIocGF0aC5qb2luKHRoaXMuY29uZmlnUGF0aCwgdGhpcy5jb25maWdOYW1lICsgJy5qc29uJykpLCB0aGlzKSA6IFxuICAgICAgICAgICAgICAgIENvbmZpZ0xvYWRlci5jcmVhdGVFbnZBd2FyZUpzb25Mb2FkZXIodGhpcy5jb25maWdQYXRoLCB0aGlzLmNvbmZpZ05hbWUsIHRoaXMuZW52LCB0aGlzKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgYXdhaXQgdGhpcy5sb2FkQ29uZmlnXygpOyAgICAgXG4gICAgICAgIH0gICBcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ29uZmlnIGxvYWRlZCBldmVudC5cbiAgICAgICAgICogQGV2ZW50IFNlcnZpY2VDb250YWluZXIjY29uZmlnTG9hZGVkXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVtaXQoJ2NvbmZpZ0xvYWRlZCcpO1xuXG4gICAgICAgIGlmIChfLmlzRW1wdHkodGhpcy5jb25maWcpKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcignRW1wdHkgY29uZmlndXJhdGlvbi4gTm90aGluZyB0byBkbyEgQ29uZmlnIHBhdGg6ICcgKyB0aGlzLmNvbmZpZ1BhdGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXdhaXQgdGhpcy5fbG9hZEZlYXR1cmVzXygpOyBcblxuICAgICAgICAvKipcbiAgICAgICAgICogQXBwIHJlYWR5XG4gICAgICAgICAqIEBldmVudCBTZXJ2aWNlQ29udGFpbmVyI3JlYWR5XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVtaXQoJ3JlYWR5Jyk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZsYWcgc2hvd2luZyB0aGUgYXBwIGlzIHN0YXJ0ZWQgb3Igbm90LlxuICAgICAgICAgKiBAbWVtYmVyIHtib29sfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFN0b3AgdGhlIGNvbnRhaW5lclxuICAgICAqIEBmaXJlcyBTZXJ2aWNlQ29udGFpbmVyI3N0b3BwaW5nXG4gICAgICogQHJldHVybnMge1Byb21pc2UuPFNlcnZpY2VDb250YWluZXI+fVxuICAgICAqL1xuICAgIGFzeW5jIHN0b3BfKCkge1xuICAgICAgICBsZXQgZWxlZ2FudFN0b3BwZXJzID0gW107XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFwcCBzdG9wcGluZ1xuICAgICAgICAgKiBAZXZlbnQgU2VydmljZUNvbnRhaW5lciNzdG9wcGluZ1xuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5lbWl0KCdzdG9wcGluZycsIGVsZWdhbnRTdG9wcGVycyk7XG5cbiAgICAgICAgaWYgKGVsZWdhbnRTdG9wcGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChlbGVnYW50U3RvcHBlcnMpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zdGFydGVkID0gZmFsc2U7XG5cbiAgICAgICAgZGVsZXRlIHRoaXMuc2VydmljZXM7XG4gICAgICAgIGRlbGV0ZSB0aGlzLmZlYXR1cmVzO1xuICAgICAgICBkZWxldGUgdGhpcy5fZmVhdHVyZVJlZ2lzdHJ5O1xuXG4gICAgICAgIGRlbGV0ZSB0aGlzLmNvbmZpZztcbiAgICAgICAgZGVsZXRlIHRoaXMuY29uZmlnTG9hZGVyOyAgXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHJldHVybnMge1NlcnZpY2VDb250YWluZXJ9XG4gICAgICovXG4gICAgYXN5bmMgbG9hZENvbmZpZ18oKSB7XG4gICAgICAgIGxldCBjb25maWdWYXJpYWJsZXMgPSB0aGlzLl9nZXRDb25maWdWYXJpYWJsZXMoKTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQXBwIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgICogQG1lbWJlciB7b2JqZWN0fSAgICAgICAgIFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5jb25maWcgPSBhd2FpdCB0aGlzLmNvbmZpZ0xvYWRlci5sb2FkXyhjb25maWdWYXJpYWJsZXMpOyAgIFxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRyYW5zbGF0ZSBhIHJlbGF0aXZlIHBhdGggb2YgdGhpcyBhcHAgbW9kdWxlIHRvIGFuIGFic29sdXRlIHBhdGggICAgIFxuICAgICAqIEBwYXJhbSB7YXJyYXl9IGFyZ3MgLSBBcnJheSBvZiBwYXRoIHBhcnRzXG4gICAgICogQHJldHVybnMge3N0cmluZ31cbiAgICAgKi9cbiAgICB0b0Fic29sdXRlUGF0aCguLi5hcmdzKSB7XG4gICAgICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMud29ya2luZ1BhdGg7XG4gICAgICAgIH0gICAgICAgXG5cbiAgICAgICAgcmV0dXJuIHBhdGgucmVzb2x2ZSh0aGlzLndvcmtpbmdQYXRoLCAuLi5hcmdzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZWdpc3RlciBhIHNlcnZpY2UgICAgIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNlcnZpY2VPYmplY3RcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IG92ZXJyaWRlXG4gICAgICovXG4gICAgcmVnaXN0ZXJTZXJ2aWNlKG5hbWUsIHNlcnZpY2VPYmplY3QsIG92ZXJyaWRlKSB7XG4gICAgICAgIGlmIChuYW1lIGluIHRoaXMuc2VydmljZXMgJiYgIW92ZXJyaWRlKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NlcnZpY2UgXCInKyBuYW1lICsnXCIgYWxyZWFkeSByZWdpc3RlcmVkIScpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zZXJ2aWNlc1tuYW1lXSA9IHNlcnZpY2VPYmplY3Q7XG4gICAgICAgIHRoaXMubG9nKCd2ZXJib3NlJywgYFNlcnZpY2UgXCIke25hbWV9XCIgcmVnaXN0ZXJlZC5gKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgd2hldGhlciBhIHNlcnZpY2UgZXhpc3RzXG4gICAgICogQHBhcmFtIHsqfSBuYW1lIFxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGhhc1NlcnZpY2UobmFtZSkge1xuICAgICAgICByZXR1cm4gbmFtZSBpbiB0aGlzLnNlcnZpY2VzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBhIHNlcnZpY2UgZnJvbSBtb2R1bGUgaGllcmFyY2h5ICAgICBcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9XG4gICAgICovXG4gICAgZ2V0U2VydmljZShuYW1lKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNlcnZpY2VzW25hbWVdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIHdoZXRoZXIgYSBmZWF0dXJlIGlzIGVuYWJsZWQgaW4gdGhlIGFwcC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmVhdHVyZSBcbiAgICAgKiBAcmV0dXJucyB7Ym9vbH1cbiAgICAgKi9cbiAgICBlbmFibGVkKGZlYXR1cmUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZmVhdHVyZXMuaGFzT3duUHJvcGVydHkoZmVhdHVyZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQWRkIG1vcmUgb3Igb3ZlcmlkZSBjdXJyZW50IGZlYXR1cmUgcmVnaXN0cnlcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVnaXN0cnkgXG4gICAgICovXG4gICAgYWRkRmVhdHVyZVJlZ2lzdHJ5KHJlZ2lzdHJ5KSB7XG4gICAgICAgIC8vICogaXMgdXNlZCBhcyB0aGUgZmFsbGJhY2sgbG9jYXRpb24gdG8gZmluZCBhIGZlYXR1cmVcbiAgICAgICAgaWYgKHJlZ2lzdHJ5Lmhhc093blByb3BlcnR5KCcqJykpIHtcbiAgICAgICAgICAgIFV0aWwucHV0SW50b0J1Y2tldCh0aGlzLl9mZWF0dXJlUmVnaXN0cnksICcqJywgcmVnaXN0cnlbJyonXSk7XG4gICAgICAgIH1cblxuICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMuX2ZlYXR1cmVSZWdpc3RyeSwgXy5vbWl0KHJlZ2lzdHJ5LCBbJyonXSkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERlZmF1bHQgbG9nIG1ldGhvZCwgbWF5IGJlIG92ZXJyaWRlIGJ5IGxvZ2dlcnMgZmVhdHVyZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSAtIExvZyBsZXZlbFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSAtIExvZyBtZXNzYWdlXG4gICAgICogQHBhcmFtIHsuLi5vYmplY3R9IC0gRXh0cmEgbWV0YSBkYXRhXG4gICAgICogQHJldHVybnMge1NlcnZpY2VDb250YWluZXJ9XG4gICAgICovXG4gICAgbG9nKGxldmVsLCBtZXNzYWdlLCAuLi5yZXN0KSB7XG4gICAgICAgIHRoaXMubG9nZ2VyICYmIHRoaXMubG9nZ2VyLmxvZyhsZXZlbCwgbWVzc2FnZSwgLi4ucmVzdCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIF9nZXRDb25maWdWYXJpYWJsZXMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAnYXBwJzogdGhpcywgICAgICAgICAgICBcbiAgICAgICAgICAgICdsb2cnOiB3aW5zdG9uLFxuICAgICAgICAgICAgJ2Vudic6IHRoaXMuZW52XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgX2dldEZlYXR1cmVGYWxsYmFja1BhdGgoKSB7XG4gICAgICAgIHJldHVybiBbIHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIExpdGVyYWwuRkVBVFVSRVNfUEFUSCksIHRoaXMudG9BYnNvbHV0ZVBhdGgoTGl0ZXJhbC5GRUFUVVJFU19QQVRIKSBdO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIGZlYXR1cmVzXG4gICAgICogQHByaXZhdGUgICAgIFxuICAgICAqIEByZXR1cm5zIHtib29sfVxuICAgICAqL1xuICAgIGFzeW5jIF9sb2FkRmVhdHVyZXNfKCkgeyAgICAgICBcbiAgICAgICAgLy8gcnVuIGNvbmZpZyBzdGFnZSBzZXBhcmF0ZWx5IGZpcnN0XG4gICAgICAgIGxldCBjb25maWdTdGFnZUZlYXR1cmVzID0gW107ICAgICAgICBcblxuICAgICAgICAvLyBsb2FkIGZlYXR1cmVzXG4gICAgICAgIF8uZm9yT3duKHRoaXMuY29uZmlnLCAoZmVhdHVyZU9wdGlvbnMsIG5hbWUpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMuYWxsb3dlZEZlYXR1cmVzICYmXG4gICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zLmFsbG93ZWRGZWF0dXJlcy5pbmRleE9mKG5hbWUpID09PSAtMSkge1xuICAgICAgICAgICAgICAgIC8vc2tpcCBkaXNhYmxlZCBmZWF0dXJlc1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IGZlYXR1cmU7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGZlYXR1cmUgPSB0aGlzLl9sb2FkRmVhdHVyZShuYW1lKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7ICAgICBcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7ICAgICAgICAgICBcbiAgICAgICAgICAgIH0gICBcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGZlYXR1cmUgJiYgZmVhdHVyZS50eXBlID09PSBGZWF0dXJlLkNPTkYpIHsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uZmlnU3RhZ2VGZWF0dXJlcy5wdXNoKFsgbmFtZSwgZmVhdHVyZS5sb2FkXywgZmVhdHVyZU9wdGlvbnMgXSk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuY29uZmlnW25hbWVdO1xuICAgICAgICAgICAgfSAgICBcbiAgICAgICAgfSk7ICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIGlmIChjb25maWdTdGFnZUZlYXR1cmVzLmxlbmd0aCA+IDApIHsgICAgICBcbiAgICAgICAgICAgIC8vY29uZmlndXJhdGlvbiBmZWF0dXJlcyB3aWxsIGJlIG92ZXJyaWRlZCBieSBuZXdseSBsb2FkZWQgY29uZmlnXG4gICAgICAgICAgICBjb25maWdTdGFnZUZlYXR1cmVzLmZvckVhY2goKFsgbmFtZSBdKSA9PiB7IGRlbGV0ZSB0aGlzLmNvbmZpZ1tuYW1lXTsgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuX2xvYWRGZWF0dXJlR3JvdXBfKGNvbmZpZ1N0YWdlRmVhdHVyZXMsIEZlYXR1cmUuQ09ORik7XG5cbiAgICAgICAgICAgIC8vcmVsb2FkIGFsbCBmZWF0dXJlcyBpZiBhbnkgdHlwZSBvZiBjb25maWd1cmF0aW9uIGZlYXR1cmUgZXhpc3RzICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbG9hZEZlYXR1cmVzXygpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGZlYXR1cmVHcm91cHMgPSB7ICAgICAgICAgICAgXG4gICAgICAgICAgICBbRmVhdHVyZS5JTklUXTogW10sICAgICAgICAgICAgXG4gICAgICAgICAgICBbRmVhdHVyZS5TRVJWSUNFXTogW10sICAgICAgICAgICAgXG4gICAgICAgICAgICBbRmVhdHVyZS5QTFVHSU5dOiBbXSxcbiAgICAgICAgICAgIFtGZWF0dXJlLkZJTkFMXTogW11cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBsb2FkIGZlYXR1cmVzXG4gICAgICAgIF8uZm9yT3duKHRoaXMuY29uZmlnLCAoZmVhdHVyZU9wdGlvbnMsIG5hbWUpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMuYWxsb3dlZEZlYXR1cmVzICYmXG4gICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zLmFsbG93ZWRGZWF0dXJlcy5pbmRleE9mKG5hbWUpID09PSAtMSkge1xuICAgICAgICAgICAgICAgIC8vc2tpcCBkaXNhYmxlZCBmZWF0dXJlc1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IGZlYXR1cmUgPSB0aGlzLl9sb2FkRmVhdHVyZShuYW1lKTtcblxuICAgICAgICAgICAgaWYgKCEoZmVhdHVyZS50eXBlIGluIGZlYXR1cmVHcm91cHMpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGZlYXR1cmUgdHlwZS4gRmVhdHVyZTogJHtuYW1lfSwgdHlwZTogJHtmZWF0dXJlLnR5cGV9YCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZlYXR1cmVHcm91cHNbZmVhdHVyZS50eXBlXS5wdXNoKFsgbmFtZSwgZmVhdHVyZS5sb2FkXywgZmVhdHVyZU9wdGlvbnMgXSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBVdGlsLmVhY2hBc3luY18oZmVhdHVyZUdyb3VwcywgKGdyb3VwLCBsZXZlbCkgPT4gdGhpcy5fbG9hZEZlYXR1cmVHcm91cF8oZ3JvdXAsIGxldmVsKSk7XG4gICAgfVxuXG4gICAgYXN5bmMgX2xvYWRGZWF0dXJlR3JvdXBfKGZlYXR1cmVHcm91cCwgZ3JvdXBMZXZlbCkge1xuICAgICAgICB0aGlzLmVtaXQoJ2JlZm9yZTonICsgZ3JvdXBMZXZlbCk7XG4gICAgICAgIHRoaXMubG9nKCd2ZXJib3NlJywgYExvYWRpbmcgXCIke2dyb3VwTGV2ZWx9XCIgZmVhdHVyZSBncm91cCAuLi5gKTtcbiAgICAgICAgYXdhaXQgVXRpbC5lYWNoQXN5bmNfKGZlYXR1cmVHcm91cCwgYXN5bmMgKFsgbmFtZSwgbG9hZF8sIG9wdGlvbnMgXSkgPT4geyAgICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuZW1pdCgnYmVmb3JlOmxvYWQ6JyArIG5hbWUpO1xuICAgICAgICAgICAgdGhpcy5sb2coJ3ZlcmJvc2UnLCBgTG9hZGluZyBmZWF0dXJlIFwiJHtuYW1lfVwiIC4uLmApO1xuXG4gICAgICAgICAgICBhd2FpdCBsb2FkXyh0aGlzLCBvcHRpb25zKTsgICBcbiAgICAgICAgICAgIHRoaXMuZmVhdHVyZXNbbmFtZV0ubG9hZGVkID0gdHJ1ZTsgICAgICAgICAgICAgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMubG9nKCd2ZXJib3NlJywgYEZlYXR1cmUgXCIke25hbWV9XCIgbG9hZGVkLiBbT0tdYCk7XG4gICAgICAgICAgICB0aGlzLmVtaXQoJ2FmdGVyOmxvYWQ6JyArIG5hbWUpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5sb2coJ3ZlcmJvc2UnLCBgRmluaXNoZWQgbG9hZGluZyBcIiR7Z3JvdXBMZXZlbH1cIiBmZWF0dXJlIGdyb3VwLiBbT0tdYCk7XG4gICAgICAgIHRoaXMuZW1pdCgnYWZ0ZXI6JyArIGdyb3VwTGV2ZWwpO1xuICAgIH0gICAgXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGEgZmVhdHVyZSBvYmplY3QgYnkgbmFtZS5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmZWF0dXJlIFxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9ICAgICBcbiAgICAgKi9cbiAgICBfbG9hZEZlYXR1cmUoZmVhdHVyZSkge1xuICAgICAgICBsZXQgZmVhdHVyZU9iamVjdCA9IHRoaXMuZmVhdHVyZXNbZmVhdHVyZV07XG4gICAgICAgIGlmIChmZWF0dXJlT2JqZWN0KSByZXR1cm4gZmVhdHVyZU9iamVjdDtcblxuICAgICAgICBsZXQgZmVhdHVyZVBhdGg7XG5cbiAgICAgICAgaWYgKHRoaXMuX2ZlYXR1cmVSZWdpc3RyeS5oYXNPd25Qcm9wZXJ0eShmZWF0dXJlKSkgeyAgICAgICAgICBcbiAgICAgICAgICAgIC8vbG9hZCBieSByZWdpc3RyeSBlbnRyeVxuICAgICAgICAgICAgbGV0IGxvYWRPcHRpb24gPSB0aGlzLl9mZWF0dXJlUmVnaXN0cnlbZmVhdHVyZV07ICAgICAgICAgICAgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGxvYWRPcHRpb24pKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxvYWRPcHRpb24ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCByZWdpc3RyeSB2YWx1ZSBmb3IgZmVhdHVyZSBcIiR7ZmVhdHVyZX1cIi5gKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmZWF0dXJlUGF0aCA9IGxvYWRPcHRpb25bMF07XG4gICAgICAgICAgICAgICAgZmVhdHVyZU9iamVjdCA9IHJlcXVpcmUoZmVhdHVyZVBhdGgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGxvYWRPcHRpb24ubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAvL29uZSBtb2R1bGUgbWF5IGNvbnRhaW5zIG1vcmUgdGhhbiBvbmUgZmVhdHVyZVxuICAgICAgICAgICAgICAgICAgICBmZWF0dXJlT2JqZWN0ID0gVXRpbC5nZXRWYWx1ZUJ5UGF0aChmZWF0dXJlT2JqZWN0LCBsb2FkT3B0aW9uWzFdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZlYXR1cmVQYXRoID0gbG9hZE9wdGlvbjtcbiAgICAgICAgICAgICAgICBmZWF0dXJlT2JqZWN0ID0gcmVxdWlyZShmZWF0dXJlUGF0aCk7XG4gICAgICAgICAgICB9ICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vbG9hZCBieSBmYWxsYmFjayBwYXRoc1xuICAgICAgICAgICAgbGV0IHNlYXJjaGluZ1BhdGggPSB0aGlzLl9mZWF0dXJlUmVnaXN0cnlbJyonXTtcbiAgICBcbiAgICAgICAgICAgIC8vcmV2ZXJzZSBmYWxsYmFjayBzdGFja1xuICAgICAgICAgICAgbGV0IGZvdW5kID0gXy5maW5kTGFzdChzZWFyY2hpbmdQYXRoLCBwID0+IHtcbiAgICAgICAgICAgICAgICBmZWF0dXJlUGF0aCA9IHBhdGguam9pbihwLCBmZWF0dXJlICsgJy5qcycpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmcy5leGlzdHNTeW5jKGZlYXR1cmVQYXRoKTtcbiAgICAgICAgICAgIH0pOyAgICAgICAgXG5cbiAgICAgICAgICAgIGlmICghZm91bmQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYERvbid0IGtub3cgd2hlcmUgdG8gbG9hZCBmZWF0dXJlIFwiJHtmZWF0dXJlfVwiLmApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmZWF0dXJlT2JqZWN0ID0gcmVxdWlyZShmZWF0dXJlUGF0aCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICghRmVhdHVyZS52YWxpZGF0ZShmZWF0dXJlT2JqZWN0KSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGZlYXR1cmUgb2JqZWN0IGxvYWRlZCBmcm9tIFwiJHtmZWF0dXJlUGF0aH1cIi5gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZmVhdHVyZXNbZmVhdHVyZV0gPSBmZWF0dXJlT2JqZWN0O1xuICAgICAgICByZXR1cm4gZmVhdHVyZU9iamVjdDtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VydmljZUNvbnRhaW5lcjsiXX0=