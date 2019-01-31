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
      this.configLoader = this.options.disableEnvAwareConfig ? new ConfigLoader(new JsonConfigProvider(path.join(this.configPath, this.configName + '.json'))) : ConfigLoader.createEnvAwareJsonLoader(this.configPath, this.configName, this.env);
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
    this.emit('stopping');
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
    return this;
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
    this.logger.log(level, message, ...rest);
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
      let feature;

      try {
        feature = this._loadFeature(name);
      } catch (err) {}

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9TZXJ2aWNlQ29udGFpbmVyLmpzIl0sIm5hbWVzIjpbIlV0aWwiLCJyZXF1aXJlIiwiQ29uZmlnTG9hZGVyIiwiSnNvbkNvbmZpZ1Byb3ZpZGVyIiwiXyIsImZzIiwiUHJvbWlzZSIsInBhdGgiLCJFdmVudEVtaXR0ZXIiLCJ3aW5zdG9uIiwiRmVhdHVyZSIsIkxpdGVyYWwiLCJTZXJ2aWNlQ29udGFpbmVyIiwiY29uc3RydWN0b3IiLCJuYW1lIiwib3B0aW9ucyIsIk9iamVjdCIsImFzc2lnbiIsImVudiIsInByb2Nlc3MiLCJOT0RFX0VOViIsIndvcmtpbmdQYXRoIiwicmVzb2x2ZSIsImN3ZCIsImNvbmZpZ1BhdGgiLCJ0b0Fic29sdXRlUGF0aCIsIkRFRkFVTFRfQ09ORklHX1BBVEgiLCJjb25maWdOYW1lIiwiQVBQX0NGR19OQU1FIiwic3RhcnRfIiwiX2ZlYXR1cmVSZWdpc3RyeSIsIl9nZXRGZWF0dXJlRmFsbGJhY2tQYXRoIiwiZmVhdHVyZXMiLCJzZXJ2aWNlcyIsImxvYWRDb25maWdGcm9tT3B0aW9ucyIsImNvbmZpZyIsImNvbmZpZ0xvYWRlciIsImRpc2FibGVFbnZBd2FyZUNvbmZpZyIsImpvaW4iLCJjcmVhdGVFbnZBd2FyZUpzb25Mb2FkZXIiLCJsb2FkQ29uZmlnXyIsImVtaXQiLCJpc0VtcHR5IiwiRXJyb3IiLCJfbG9hZEZlYXR1cmVzXyIsInN0YXJ0ZWQiLCJzdG9wXyIsImNvbmZpZ1ZhcmlhYmxlcyIsIl9nZXRDb25maWdWYXJpYWJsZXMiLCJsb2FkXyIsImFyZ3MiLCJsZW5ndGgiLCJyZWdpc3RlclNlcnZpY2UiLCJzZXJ2aWNlT2JqZWN0Iiwib3ZlcnJpZGUiLCJnZXRTZXJ2aWNlIiwiZW5hYmxlZCIsImZlYXR1cmUiLCJoYXNPd25Qcm9wZXJ0eSIsImFkZEZlYXR1cmVSZWdpc3RyeSIsInJlZ2lzdHJ5IiwicHV0SW50b0J1Y2tldCIsIm9taXQiLCJsb2ciLCJsZXZlbCIsIm1lc3NhZ2UiLCJyZXN0IiwibG9nZ2VyIiwiX19kaXJuYW1lIiwiRkVBVFVSRVNfUEFUSCIsImNvbmZpZ1N0YWdlRmVhdHVyZXMiLCJmb3JPd24iLCJmZWF0dXJlT3B0aW9ucyIsIl9sb2FkRmVhdHVyZSIsImVyciIsInR5cGUiLCJDT05GIiwicHVzaCIsImZvckVhY2giLCJfbG9hZEZlYXR1cmVHcm91cF8iLCJmZWF0dXJlR3JvdXBzIiwiSU5JVCIsIlNFUlZJQ0UiLCJQTFVHSU4iLCJGSU5BTCIsImVhY2hBc3luY18iLCJncm91cCIsImZlYXR1cmVHcm91cCIsImdyb3VwTGV2ZWwiLCJsb2FkZWQiLCJmZWF0dXJlT2JqZWN0IiwiZmVhdHVyZVBhdGgiLCJsb2FkT3B0aW9uIiwiQXJyYXkiLCJpc0FycmF5IiwiZ2V0VmFsdWVCeVBhdGgiLCJzZWFyY2hpbmdQYXRoIiwiZm91bmQiLCJmaW5kTGFzdCIsInAiLCJleGlzdHNTeW5jIiwidmFsaWRhdGUiLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiQUFBQTs7OztBQUVBLE1BQU1BLElBQUksR0FBR0MsT0FBTyxDQUFDLFVBQUQsQ0FBcEI7O0FBQ0EsTUFBTUMsWUFBWSxHQUFHRCxPQUFPLENBQUMsV0FBRCxDQUE1Qjs7QUFDQSxNQUFNRSxrQkFBa0IsR0FBR0YsT0FBTyxDQUFDLGtDQUFELENBQWxDOztBQUNBLE1BQU07QUFBRUcsRUFBQUEsQ0FBRjtBQUFLQyxFQUFBQSxFQUFMO0FBQVNDLEVBQUFBO0FBQVQsSUFBcUJOLElBQTNCOztBQUNBLE1BQU1PLElBQUksR0FBR04sT0FBTyxDQUFDLE1BQUQsQ0FBcEI7O0FBQ0EsTUFBTU8sWUFBWSxHQUFHUCxPQUFPLENBQUMsUUFBRCxDQUE1Qjs7QUFDQSxNQUFNUSxPQUFPLEdBQUdSLE9BQU8sQ0FBQyxTQUFELENBQXZCOztBQUVBLE1BQU1TLE9BQU8sR0FBR1QsT0FBTyxDQUFDLGdCQUFELENBQXZCOztBQUNBLE1BQU1VLE9BQU8sR0FBR1YsT0FBTyxDQUFDLGdCQUFELENBQXZCOztBQU9BLE1BQU1XLGdCQUFOLFNBQStCSixZQUEv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bEMsWUFBTSxJQUFJL0MsS0FBSixDQUFXLHVDQUFzQ2dELFdBQVksSUFBN0QsQ0FBTjtBQUNIOztBQUVELFNBQUszRCxRQUFMLENBQWN5QixPQUFkLElBQXlCaUMsYUFBekI7QUFDQSxXQUFPQSxhQUFQO0FBQ0g7O0FBeFd1Qzs7QUEyVzVDWSxNQUFNLENBQUNDLE9BQVAsR0FBaUIzRixnQkFBakIiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcblxuY29uc3QgVXRpbCA9IHJlcXVpcmUoJ3JrLXV0aWxzJyk7XG5jb25zdCBDb25maWdMb2FkZXIgPSByZXF1aXJlKCdyay1jb25maWcnKTtcbmNvbnN0IEpzb25Db25maWdQcm92aWRlciA9IHJlcXVpcmUoJ3JrLWNvbmZpZy9saWIvSnNvbkNvbmZpZ1Byb3ZpZGVyJyk7XG5jb25zdCB7IF8sIGZzLCBQcm9taXNlIH0gPSBVdGlsO1xuY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbmNvbnN0IEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpO1xuY29uc3Qgd2luc3RvbiA9IHJlcXVpcmUoJ3dpbnN0b24nKTtcblxuY29uc3QgRmVhdHVyZSA9IHJlcXVpcmUoJy4vZW51bS9GZWF0dXJlJyk7XG5jb25zdCBMaXRlcmFsID0gcmVxdWlyZSgnLi9lbnVtL0xpdGVyYWwnKTtcblxuLyoqXG4gKiBTZXJ2aWNlIGNvbnRhaW5lciBjbGFzcy5cbiAqIEBjbGFzc1xuICogQGV4dGVuZHMgRXZlbnRFbWl0dGVyICAgICBcbiAqL1xuY2xhc3MgU2VydmljZUNvbnRhaW5lciBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gICAgLyoqICAgICBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBjb250YWluZXIgaW5zdGFuY2UuICAgICBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdIC0gQ29udGFpbmVyIG9wdGlvbnMgICAgICAgICAgXG4gICAgICogQHByb3BlcnR5IHtzdHJpbmd9IFtvcHRpb25zLmVudl0gLSBFbnZpcm9ubWVudCwgZGVmYXVsdCB0byBwcm9jZXNzLmVudi5OT0RFX0VOVlxuICAgICAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBbb3B0aW9ucy53b3JraW5nUGF0aF0gLSBBcHAncyB3b3JraW5nIHBhdGgsIGRlZmF1bHQgdG8gcHJvY2Vzcy5jd2QoKVxuICAgICAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBbb3B0aW9ucy5jb25maWdQYXRoXSAtIEFwcCdzIGNvbmZpZyBwYXRoLCBkZWZhdWx0IHRvIFwiY29uZlwiIHVuZGVyIHdvcmtpbmdQYXRoXG4gICAgICogQHByb3BlcnR5IHtzdHJpbmd9IFtvcHRpb25zLmNvbmZpZ05hbWVdIC0gQXBwJ3MgY29uZmlnIGJhc2VuYW1lLCBkZWZhdWx0IHRvIFwiYXBwXCJcbiAgICAgKiBAcHJvcGVydHkge3N0cmluZ30gW29wdGlvbnMuZGlzYWJsZUVudkF3YXJlQ29uZmlnPWZhbHNlXSAtIERvbid0IHVzZSBlbnZpcm9ubWVudC1hd2FyZSBjb25maWcgICAgIFxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKG5hbWUsIG9wdGlvbnMpIHtcbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogTmFtZSBvZiB0aGUgYXBwXG4gICAgICAgICAqIEBtZW1iZXIge29iamVjdH0gICAgICAgICBcbiAgICAgICAgICoqL1xuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lOyAgICAgICAgICAgICAgICBcblxuICAgICAgICAvKipcbiAgICAgICAgICogQXBwIG9wdGlvbnNcbiAgICAgICAgICogQG1lbWJlciB7b2JqZWN0fSAgICAgICAgIFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5vcHRpb25zID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgICAvLy4uLiBkZWZhdWx0IG9wdGlvbnMgICAgICAgICAgICBcbiAgICAgICAgfSwgb3B0aW9ucyk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEVudmlyb25tZW50IGZsYWdcbiAgICAgICAgICogQG1lbWJlciB7c3RyaW5nfSAgICAgICAgXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVudiA9IHRoaXMub3B0aW9ucy5lbnYgfHwgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgfHwgXCJkZXZlbG9wbWVudFwiO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXb3JraW5nIGRpcmVjdG9yeSBvZiB0aGlzIGNsaSBhcHBcbiAgICAgICAgICogQG1lbWJlciB7c3RyaW5nfSAgICAgICAgIFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy53b3JraW5nUGF0aCA9IHRoaXMub3B0aW9ucy53b3JraW5nUGF0aCA/IHBhdGgucmVzb2x2ZSh0aGlzLm9wdGlvbnMud29ya2luZ1BhdGgpIDogcHJvY2Vzcy5jd2QoKTsgICAgIFxuICAgICAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbmZpZyBwYXRoXG4gICAgICAgICAqIEBtZW1iZXIge3N0cmluZ30gICAgICAgICBcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuY29uZmlnUGF0aCA9IHRoaXMudG9BYnNvbHV0ZVBhdGgodGhpcy5vcHRpb25zLmNvbmZpZ1BhdGggfHwgTGl0ZXJhbC5ERUZBVUxUX0NPTkZJR19QQVRIKTsgICAgICBcbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb25maWcgYmFzZW5hbWVcbiAgICAgICAgICogQG1lbWJlciB7c3RyaW5nfSAgICAgICAgIFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5jb25maWdOYW1lID0gdGhpcy5vcHRpb25zLmNvbmZpZ05hbWUgfHwgTGl0ZXJhbC5BUFBfQ0ZHX05BTUU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU3RhcnQgdGhlIGNvbnRhaW5lci5cbiAgICAgKiBAZmlyZXMgU2VydmljZUNvbnRhaW5lciNjb25maWdMb2FkZWRcbiAgICAgKiBAZmlyZXMgU2VydmljZUNvbnRhaW5lciNyZWFkeVxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlLjxTZXJ2aWNlQ29udGFpbmVyPn1cbiAgICAgKi9cbiAgICBhc3luYyBzdGFydF8oKSB7ICAgICAgICAgICAgXG4gICAgICAgIHRoaXMuX2ZlYXR1cmVSZWdpc3RyeSA9IHtcbiAgICAgICAgICAgIC8vZmlyc3RseSBsb29rIHVwIFwiZmVhdHVyZXNcIiB1bmRlciBjdXJyZW50IHdvcmtpbmcgcGF0aCwgYW5kIHRoZW4gdHJ5IHRoZSBidWlsdGluIGZlYXR1cmVzIHBhdGhcbiAgICAgICAgICAgICcqJzogdGhpcy5fZ2V0RmVhdHVyZUZhbGxiYWNrUGF0aCgpXG4gICAgICAgIH07XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBMb2FkZWQgZmVhdHVyZXMsIG5hbWUgPT4gZmVhdHVyZSBvYmplY3RcbiAgICAgICAgICogQG1lbWJlciB7b2JqZWN0fSAgICAgICAgIFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5mZWF0dXJlcyA9IHt9O1xuICAgICAgICAvKipcbiAgICAgICAgICogTG9hZGVkIHNlcnZpY2VzXG4gICAgICAgICAqIEBtZW1iZXIge29iamVjdH0gICAgICAgICBcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc2VydmljZXMgPSB7fTsgICAgICAgXG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmxvYWRDb25maWdGcm9tT3B0aW9ucykge1xuICAgICAgICAgICAgdGhpcy5jb25maWcgPSB0aGlzLm9wdGlvbnMuY29uZmlnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb25maWd1cmF0aW9uIGxvYWRlciBpbnN0YW5jZVxuICAgICAgICAgICAgICogQG1lbWJlciB7Q29uZmlnTG9hZGVyfSAgICAgICAgIFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLmNvbmZpZ0xvYWRlciA9IHRoaXMub3B0aW9ucy5kaXNhYmxlRW52QXdhcmVDb25maWcgPyBcbiAgICAgICAgICAgICAgICBuZXcgQ29uZmlnTG9hZGVyKG5ldyBKc29uQ29uZmlnUHJvdmlkZXIocGF0aC5qb2luKHRoaXMuY29uZmlnUGF0aCwgdGhpcy5jb25maWdOYW1lICsgJy5qc29uJykpKSA6IFxuICAgICAgICAgICAgICAgIENvbmZpZ0xvYWRlci5jcmVhdGVFbnZBd2FyZUpzb25Mb2FkZXIodGhpcy5jb25maWdQYXRoLCB0aGlzLmNvbmZpZ05hbWUsIHRoaXMuZW52KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgYXdhaXQgdGhpcy5sb2FkQ29uZmlnXygpOyAgICAgXG4gICAgICAgIH0gICBcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ29uZmlnIGxvYWRlZCBldmVudC5cbiAgICAgICAgICogQGV2ZW50IFNlcnZpY2VDb250YWluZXIjY29uZmlnTG9hZGVkXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVtaXQoJ2NvbmZpZ0xvYWRlZCcpO1xuXG4gICAgICAgIGlmIChfLmlzRW1wdHkodGhpcy5jb25maWcpKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcignRW1wdHkgY29uZmlndXJhdGlvbi4gTm90aGluZyB0byBkbyEgQ29uZmlnIHBhdGg6ICcgKyB0aGlzLmNvbmZpZ1BhdGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXdhaXQgdGhpcy5fbG9hZEZlYXR1cmVzXygpOyBcblxuICAgICAgICAvKipcbiAgICAgICAgICogQXBwIHJlYWR5XG4gICAgICAgICAqIEBldmVudCBTZXJ2aWNlQ29udGFpbmVyI3JlYWR5XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVtaXQoJ3JlYWR5Jyk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZsYWcgc2hvd2luZyB0aGUgYXBwIGlzIHN0YXJ0ZWQgb3Igbm90LlxuICAgICAgICAgKiBAbWVtYmVyIHtib29sfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFN0b3AgdGhlIGNvbnRhaW5lclxuICAgICAqIEBmaXJlcyBTZXJ2aWNlQ29udGFpbmVyI3N0b3BwaW5nXG4gICAgICogQHJldHVybnMge1Byb21pc2UuPFNlcnZpY2VDb250YWluZXI+fVxuICAgICAqL1xuICAgIGFzeW5jIHN0b3BfKCkge1xuICAgICAgICAvKipcbiAgICAgICAgICogQXBwIHN0b3BwaW5nXG4gICAgICAgICAqIEBldmVudCBTZXJ2aWNlQ29udGFpbmVyI3N0b3BwaW5nXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVtaXQoJ3N0b3BwaW5nJyk7XG4gICAgICAgIHRoaXMuc3RhcnRlZCA9IGZhbHNlO1xuXG4gICAgICAgIGRlbGV0ZSB0aGlzLnNlcnZpY2VzO1xuICAgICAgICBkZWxldGUgdGhpcy5mZWF0dXJlcztcbiAgICAgICAgZGVsZXRlIHRoaXMuX2ZlYXR1cmVSZWdpc3RyeTtcblxuICAgICAgICBkZWxldGUgdGhpcy5jb25maWc7XG4gICAgICAgIGRlbGV0ZSB0aGlzLmNvbmZpZ0xvYWRlcjsgIFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEByZXR1cm5zIHtTZXJ2aWNlQ29udGFpbmVyfVxuICAgICAqL1xuICAgIGFzeW5jIGxvYWRDb25maWdfKCkge1xuICAgICAgICBsZXQgY29uZmlnVmFyaWFibGVzID0gdGhpcy5fZ2V0Q29uZmlnVmFyaWFibGVzKCk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFwcCBjb25maWd1cmF0aW9uXG4gICAgICAgICAqIEBtZW1iZXIge29iamVjdH0gICAgICAgICBcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuY29uZmlnID0gYXdhaXQgdGhpcy5jb25maWdMb2FkZXIubG9hZF8oY29uZmlnVmFyaWFibGVzKTsgICBcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUcmFuc2xhdGUgYSByZWxhdGl2ZSBwYXRoIG9mIHRoaXMgYXBwIG1vZHVsZSB0byBhbiBhYnNvbHV0ZSBwYXRoICAgICBcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBhcmdzIC0gQXJyYXkgb2YgcGF0aCBwYXJ0c1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICovXG4gICAgdG9BYnNvbHV0ZVBhdGgoLi4uYXJncykge1xuICAgICAgICBpZiAoYXJncy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLndvcmtpbmdQYXRoO1xuICAgICAgICB9ICAgICAgIFxuXG4gICAgICAgIHJldHVybiBwYXRoLnJlc29sdmUodGhpcy53b3JraW5nUGF0aCwgLi4uYXJncyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXIgYSBzZXJ2aWNlICAgICBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXJ2aWNlT2JqZWN0XG4gICAgICogQHBhcmFtIHtib29sZWFufSBvdmVycmlkZVxuICAgICAqL1xuICAgIHJlZ2lzdGVyU2VydmljZShuYW1lLCBzZXJ2aWNlT2JqZWN0LCBvdmVycmlkZSkge1xuICAgICAgICBpZiAobmFtZSBpbiB0aGlzLnNlcnZpY2VzICYmICFvdmVycmlkZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTZXJ2aWNlIFwiJysgbmFtZSArJ1wiIGFscmVhZHkgcmVnaXN0ZXJlZCEnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc2VydmljZXNbbmFtZV0gPSBzZXJ2aWNlT2JqZWN0O1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYSBzZXJ2aWNlIGZyb20gbW9kdWxlIGhpZXJhcmNoeSAgICAgXG4gICAgICogQHBhcmFtIG5hbWVcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fVxuICAgICAqL1xuICAgIGdldFNlcnZpY2UobmFtZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXJ2aWNlc1tuYW1lXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayB3aGV0aGVyIGEgZmVhdHVyZSBpcyBlbmFibGVkIGluIHRoZSBhcHAuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZlYXR1cmUgXG4gICAgICogQHJldHVybnMge2Jvb2x9XG4gICAgICovXG4gICAgZW5hYmxlZChmZWF0dXJlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmZlYXR1cmVzLmhhc093blByb3BlcnR5KGZlYXR1cmUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFkZCBtb3JlIG9yIG92ZXJpZGUgY3VycmVudCBmZWF0dXJlIHJlZ2lzdHJ5XG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlZ2lzdHJ5IFxuICAgICAqL1xuICAgIGFkZEZlYXR1cmVSZWdpc3RyeShyZWdpc3RyeSkge1xuICAgICAgICAvLyAqIGlzIHVzZWQgYXMgdGhlIGZhbGxiYWNrIGxvY2F0aW9uIHRvIGZpbmQgYSBmZWF0dXJlXG4gICAgICAgIGlmIChyZWdpc3RyeS5oYXNPd25Qcm9wZXJ0eSgnKicpKSB7XG4gICAgICAgICAgICBVdGlsLnB1dEludG9CdWNrZXQodGhpcy5fZmVhdHVyZVJlZ2lzdHJ5LCAnKicsIHJlZ2lzdHJ5WycqJ10pO1xuICAgICAgICB9XG5cbiAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLl9mZWF0dXJlUmVnaXN0cnksIF8ub21pdChyZWdpc3RyeSwgWycqJ10pKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IGxvZyBtZXRob2QsIG1heSBiZSBvdmVycmlkZSBieSBsb2dnZXJzIGZlYXR1cmVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gLSBMb2cgbGV2ZWxcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gLSBMb2cgbWVzc2FnZVxuICAgICAqIEBwYXJhbSB7Li4ub2JqZWN0fSAtIEV4dHJhIG1ldGEgZGF0YVxuICAgICAqIEByZXR1cm5zIHtTZXJ2aWNlQ29udGFpbmVyfVxuICAgICAqL1xuICAgIGxvZyhsZXZlbCwgbWVzc2FnZSwgLi4ucmVzdCkge1xuICAgICAgICB0aGlzLmxvZ2dlci5sb2cobGV2ZWwsIG1lc3NhZ2UsIC4uLnJlc3QpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBfZ2V0Q29uZmlnVmFyaWFibGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgJ2FwcCc6IHRoaXMsICAgICAgICAgICAgXG4gICAgICAgICAgICAnbG9nJzogd2luc3RvbixcbiAgICAgICAgICAgICdlbnYnOiB0aGlzLmVudlxuICAgICAgICB9O1xuICAgIH1cblxuICAgIF9nZXRGZWF0dXJlRmFsbGJhY2tQYXRoKCkge1xuICAgICAgICByZXR1cm4gWyBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBMaXRlcmFsLkZFQVRVUkVTX1BBVEgpLCB0aGlzLnRvQWJzb2x1dGVQYXRoKExpdGVyYWwuRkVBVFVSRVNfUEFUSCkgXTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBmZWF0dXJlc1xuICAgICAqIEBwcml2YXRlICAgICBcbiAgICAgKiBAcmV0dXJucyB7Ym9vbH1cbiAgICAgKi9cbiAgICBhc3luYyBfbG9hZEZlYXR1cmVzXygpIHsgICAgICAgXG4gICAgICAgIC8vIHJ1biBjb25maWcgc3RhZ2Ugc2VwYXJhdGVseSBmaXJzdFxuICAgICAgICBsZXQgY29uZmlnU3RhZ2VGZWF0dXJlcyA9IFtdOyAgICAgICAgXG5cbiAgICAgICAgLy8gbG9hZCBmZWF0dXJlc1xuICAgICAgICBfLmZvck93bih0aGlzLmNvbmZpZywgKGZlYXR1cmVPcHRpb25zLCBuYW1lKSA9PiB7XG4gICAgICAgICAgICBsZXQgZmVhdHVyZTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgZmVhdHVyZSA9IHRoaXMuX2xvYWRGZWF0dXJlKG5hbWUpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9IGNhdGNoIChlcnIpIHsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9ICAgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChmZWF0dXJlICYmIGZlYXR1cmUudHlwZSA9PT0gRmVhdHVyZS5DT05GKSB7ICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbmZpZ1N0YWdlRmVhdHVyZXMucHVzaChbIG5hbWUsIGZlYXR1cmUubG9hZF8sIGZlYXR1cmVPcHRpb25zIF0pO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmNvbmZpZ1tuYW1lXTtcbiAgICAgICAgICAgIH0gICAgXG4gICAgICAgIH0pOyAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBpZiAoY29uZmlnU3RhZ2VGZWF0dXJlcy5sZW5ndGggPiAwKSB7ICAgICAgXG4gICAgICAgICAgICAvL2NvbmZpZ3VyYXRpb24gZmVhdHVyZXMgd2lsbCBiZSBvdmVycmlkZWQgYnkgbmV3bHkgbG9hZGVkIGNvbmZpZ1xuICAgICAgICAgICAgY29uZmlnU3RhZ2VGZWF0dXJlcy5mb3JFYWNoKChbIG5hbWUgXSkgPT4geyBkZWxldGUgdGhpcy5jb25maWdbbmFtZV07IH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBhd2FpdCB0aGlzLl9sb2FkRmVhdHVyZUdyb3VwXyhjb25maWdTdGFnZUZlYXR1cmVzLCBGZWF0dXJlLkNPTkYpO1xuXG4gICAgICAgICAgICAvL3JlbG9hZCBhbGwgZmVhdHVyZXMgaWYgYW55IHR5cGUgb2YgY29uZmlndXJhdGlvbiBmZWF0dXJlIGV4aXN0cyAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2xvYWRGZWF0dXJlc18oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBmZWF0dXJlR3JvdXBzID0geyAgICAgICAgICAgIFxuICAgICAgICAgICAgW0ZlYXR1cmUuSU5JVF06IFtdLCAgICAgICAgICAgIFxuICAgICAgICAgICAgW0ZlYXR1cmUuU0VSVklDRV06IFtdLCAgICAgICAgICAgIFxuICAgICAgICAgICAgW0ZlYXR1cmUuUExVR0lOXTogW10sXG4gICAgICAgICAgICBbRmVhdHVyZS5GSU5BTF06IFtdXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gbG9hZCBmZWF0dXJlc1xuICAgICAgICBfLmZvck93bih0aGlzLmNvbmZpZywgKGZlYXR1cmVPcHRpb25zLCBuYW1lKSA9PiB7XG4gICAgICAgICAgICBsZXQgZmVhdHVyZSA9IHRoaXMuX2xvYWRGZWF0dXJlKG5hbWUpO1xuXG4gICAgICAgICAgICBpZiAoIShmZWF0dXJlLnR5cGUgaW4gZmVhdHVyZUdyb3VwcykpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgZmVhdHVyZSB0eXBlLiBGZWF0dXJlOiAke25hbWV9LCB0eXBlOiAke2ZlYXR1cmUudHlwZX1gKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZmVhdHVyZUdyb3Vwc1tmZWF0dXJlLnR5cGVdLnB1c2goWyBuYW1lLCBmZWF0dXJlLmxvYWRfLCBmZWF0dXJlT3B0aW9ucyBdKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIFV0aWwuZWFjaEFzeW5jXyhmZWF0dXJlR3JvdXBzLCAoZ3JvdXAsIGxldmVsKSA9PiB0aGlzLl9sb2FkRmVhdHVyZUdyb3VwXyhncm91cCwgbGV2ZWwpKTtcbiAgICB9XG5cbiAgICBhc3luYyBfbG9hZEZlYXR1cmVHcm91cF8oZmVhdHVyZUdyb3VwLCBncm91cExldmVsKSB7XG4gICAgICAgIHRoaXMuZW1pdCgnYmVmb3JlOicgKyBncm91cExldmVsKTtcbiAgICAgICAgdGhpcy5sb2coJ3ZlcmJvc2UnLCBgTG9hZGluZyBcIiR7Z3JvdXBMZXZlbH1cIiBmZWF0dXJlIGdyb3VwIC4uLmApO1xuICAgICAgICBhd2FpdCBVdGlsLmVhY2hBc3luY18oZmVhdHVyZUdyb3VwLCBhc3luYyAoWyBuYW1lLCBsb2FkXywgb3B0aW9ucyBdKSA9PiB7ICAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5lbWl0KCdiZWZvcmU6bG9hZDonICsgbmFtZSk7XG4gICAgICAgICAgICB0aGlzLmxvZygndmVyYm9zZScsIGBMb2FkaW5nIGZlYXR1cmUgXCIke25hbWV9XCIgLi4uYCk7XG5cbiAgICAgICAgICAgIGF3YWl0IGxvYWRfKHRoaXMsIG9wdGlvbnMpOyAgIFxuICAgICAgICAgICAgdGhpcy5mZWF0dXJlc1tuYW1lXS5sb2FkZWQgPSB0cnVlOyAgICAgICAgICAgICBcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5sb2coJ3ZlcmJvc2UnLCBgRmVhdHVyZSBcIiR7bmFtZX1cIiBsb2FkZWQuIFtPS11gKTtcbiAgICAgICAgICAgIHRoaXMuZW1pdCgnYWZ0ZXI6bG9hZDonICsgbmFtZSk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmxvZygndmVyYm9zZScsIGBGaW5pc2hlZCBsb2FkaW5nIFwiJHtncm91cExldmVsfVwiIGZlYXR1cmUgZ3JvdXAuIFtPS11gKTtcbiAgICAgICAgdGhpcy5lbWl0KCdhZnRlcjonICsgZ3JvdXBMZXZlbCk7XG4gICAgfSAgICBcblxuICAgIC8qKlxuICAgICAqIExvYWQgYSBmZWF0dXJlIG9iamVjdCBieSBuYW1lLlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZlYXR1cmUgXG4gICAgICogQHJldHVybnMge29iamVjdH0gICAgIFxuICAgICAqL1xuICAgIF9sb2FkRmVhdHVyZShmZWF0dXJlKSB7XG4gICAgICAgIGxldCBmZWF0dXJlT2JqZWN0ID0gdGhpcy5mZWF0dXJlc1tmZWF0dXJlXTtcbiAgICAgICAgaWYgKGZlYXR1cmVPYmplY3QpIHJldHVybiBmZWF0dXJlT2JqZWN0O1xuXG4gICAgICAgIGxldCBmZWF0dXJlUGF0aDtcblxuICAgICAgICBpZiAodGhpcy5fZmVhdHVyZVJlZ2lzdHJ5Lmhhc093blByb3BlcnR5KGZlYXR1cmUpKSB7ICAgICAgICAgIFxuICAgICAgICAgICAgLy9sb2FkIGJ5IHJlZ2lzdHJ5IGVudHJ5XG4gICAgICAgICAgICBsZXQgbG9hZE9wdGlvbiA9IHRoaXMuX2ZlYXR1cmVSZWdpc3RyeVtmZWF0dXJlXTsgICAgICAgICAgICBcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobG9hZE9wdGlvbikpIHtcbiAgICAgICAgICAgICAgICBpZiAobG9hZE9wdGlvbi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHJlZ2lzdHJ5IHZhbHVlIGZvciBmZWF0dXJlIFwiJHtmZWF0dXJlfVwiLmApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGZlYXR1cmVQYXRoID0gbG9hZE9wdGlvblswXTtcbiAgICAgICAgICAgICAgICBmZWF0dXJlT2JqZWN0ID0gcmVxdWlyZShmZWF0dXJlUGF0aCk7XG5cbiAgICAgICAgICAgICAgICBpZiAobG9hZE9wdGlvbi5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vb25lIG1vZHVsZSBtYXkgY29udGFpbnMgbW9yZSB0aGFuIG9uZSBmZWF0dXJlXG4gICAgICAgICAgICAgICAgICAgIGZlYXR1cmVPYmplY3QgPSBVdGlsLmdldFZhbHVlQnlQYXRoKGZlYXR1cmVPYmplY3QsIGxvYWRPcHRpb25bMV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZmVhdHVyZVBhdGggPSBsb2FkT3B0aW9uO1xuICAgICAgICAgICAgICAgIGZlYXR1cmVPYmplY3QgPSByZXF1aXJlKGZlYXR1cmVQYXRoKTtcbiAgICAgICAgICAgIH0gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy9sb2FkIGJ5IGZhbGxiYWNrIHBhdGhzXG4gICAgICAgICAgICBsZXQgc2VhcmNoaW5nUGF0aCA9IHRoaXMuX2ZlYXR1cmVSZWdpc3RyeVsnKiddO1xuICAgIFxuICAgICAgICAgICAgLy9yZXZlcnNlIGZhbGxiYWNrIHN0YWNrXG4gICAgICAgICAgICBsZXQgZm91bmQgPSBfLmZpbmRMYXN0KHNlYXJjaGluZ1BhdGgsIHAgPT4ge1xuICAgICAgICAgICAgICAgIGZlYXR1cmVQYXRoID0gcGF0aC5qb2luKHAsIGZlYXR1cmUgKyAnLmpzJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZzLmV4aXN0c1N5bmMoZmVhdHVyZVBhdGgpO1xuICAgICAgICAgICAgfSk7ICAgICAgICBcblxuICAgICAgICAgICAgaWYgKCFmb3VuZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRG9uJ3Qga25vdyB3aGVyZSB0byBsb2FkIGZlYXR1cmUgXCIke2ZlYXR1cmV9XCIuYCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZlYXR1cmVPYmplY3QgPSByZXF1aXJlKGZlYXR1cmVQYXRoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKCFGZWF0dXJlLnZhbGlkYXRlKGZlYXR1cmVPYmplY3QpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgZmVhdHVyZSBvYmplY3QgbG9hZGVkIGZyb20gXCIke2ZlYXR1cmVQYXRofVwiLmApO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5mZWF0dXJlc1tmZWF0dXJlXSA9IGZlYXR1cmVPYmplY3Q7XG4gICAgICAgIHJldHVybiBmZWF0dXJlT2JqZWN0O1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZXJ2aWNlQ29udGFpbmVyOyJdfQ==