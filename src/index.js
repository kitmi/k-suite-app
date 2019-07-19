const App = require('./App');

App.Runable = require('./Runable');
App.ServiceContainer = require('./ServiceContainer');
App.Helpers = require('./utils/Helpers');
App.Errors = require('./utils/Errors');
App.startWorker = require('./apps/worker');
App.startLoopWorker = require('./apps/loopWorker');

module.exports = App;