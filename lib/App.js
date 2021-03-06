"use strict";

require("source-map-support/register");

const ServiceContainer = require('./ServiceContainer');

const Runable = require('./Runable');

class App extends Runable(ServiceContainer) {
  constructor(name, options) {
    super(name || 'cli', options);
  }

}

module.exports = App;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9BcHAuanMiXSwibmFtZXMiOlsiU2VydmljZUNvbnRhaW5lciIsInJlcXVpcmUiLCJSdW5hYmxlIiwiQXBwIiwiY29uc3RydWN0b3IiLCJuYW1lIiwib3B0aW9ucyIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiJBQUFBOzs7O0FBRUEsTUFBTUEsZ0JBQWdCLEdBQUdDLE9BQU8sQ0FBQyxvQkFBRCxDQUFoQzs7QUFDQSxNQUFNQyxPQUFPLEdBQUdELE9BQU8sQ0FBQyxXQUFELENBQXZCOztBQVFBLE1BQU1FLEdBQU4sU0FBa0JELE9BQU8sQ0FBQ0YsZ0JBQUQsQ0FBekIsQ0FBNEM7QUFDeENJLEVBQUFBLFdBQVcsQ0FBQ0MsSUFBRCxFQUFPQyxPQUFQLEVBQWdCO0FBQ3ZCLFVBQU1ELElBQUksSUFBSSxLQUFkLEVBQXFCQyxPQUFyQjtBQUNIOztBQUh1Qzs7QUFNNUNDLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQkwsR0FBakIiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcblxuY29uc3QgU2VydmljZUNvbnRhaW5lciA9IHJlcXVpcmUoJy4vU2VydmljZUNvbnRhaW5lcicpO1xuY29uc3QgUnVuYWJsZSA9IHJlcXVpcmUoJy4vUnVuYWJsZScpO1xuXG4vKipcbiAqIENsaSBhcHAuXG4gKiBAY2xhc3NcbiAqIEBtaXhlcyB7UnVuYWJsZX1cbiAqIEBleHRlbmRzIHtTZXJ2aWNlQ29udGFpbmVyfSAgICAgXG4gKi9cbmNsYXNzIEFwcCBleHRlbmRzIFJ1bmFibGUoU2VydmljZUNvbnRhaW5lcikge1xuICAgIGNvbnN0cnVjdG9yKG5hbWUsIG9wdGlvbnMpIHtcbiAgICAgICAgc3VwZXIobmFtZSB8fCAnY2xpJywgb3B0aW9ucyk7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcDsiXX0=