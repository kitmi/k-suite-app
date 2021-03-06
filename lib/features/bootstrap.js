"use strict";

require("source-map-support/register");

const path = require('path');

const Feature = require('../enum/Feature');

const Literal = require('../enum/Literal');

const Util = require('rk-utils');

module.exports = {
  type: Feature.PLUGIN,
  load_: async function (app, options) {
    let bootPath = options.path ? app.toAbsolutePath(options.path) : path.join(app.workingPath, Literal.DEFAULT_BOOTSTRAP_PATH);
    let bp = path.join(bootPath, '**', '*.js');
    let files = await Util.glob(bp, {
      nodir: true
    });
    return Util.eachAsync_(files, async file => {
      let bootstrap = require(file);

      return bootstrap(app);
    });
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9mZWF0dXJlcy9ib290c3RyYXAuanMiXSwibmFtZXMiOlsicGF0aCIsInJlcXVpcmUiLCJGZWF0dXJlIiwiTGl0ZXJhbCIsIlV0aWwiLCJtb2R1bGUiLCJleHBvcnRzIiwidHlwZSIsIlBMVUdJTiIsImxvYWRfIiwiYXBwIiwib3B0aW9ucyIsImJvb3RQYXRoIiwidG9BYnNvbHV0ZVBhdGgiLCJqb2luIiwid29ya2luZ1BhdGgiLCJERUZBVUxUX0JPT1RTVFJBUF9QQVRIIiwiYnAiLCJmaWxlcyIsImdsb2IiLCJub2RpciIsImVhY2hBc3luY18iLCJmaWxlIiwiYm9vdHN0cmFwIl0sIm1hcHBpbmdzIjoiQUFBQTs7OztBQU9BLE1BQU1BLElBQUksR0FBR0MsT0FBTyxDQUFDLE1BQUQsQ0FBcEI7O0FBQ0EsTUFBTUMsT0FBTyxHQUFHRCxPQUFPLENBQUMsaUJBQUQsQ0FBdkI7O0FBQ0EsTUFBTUUsT0FBTyxHQUFHRixPQUFPLENBQUMsaUJBQUQsQ0FBdkI7O0FBQ0EsTUFBTUcsSUFBSSxHQUFHSCxPQUFPLENBQUMsVUFBRCxDQUFwQjs7QUFFQUksTUFBTSxDQUFDQyxPQUFQLEdBQWlCO0FBTWJDLEVBQUFBLElBQUksRUFBRUwsT0FBTyxDQUFDTSxNQU5EO0FBZWJDLEVBQUFBLEtBQUssRUFBRSxnQkFBZ0JDLEdBQWhCLEVBQXFCQyxPQUFyQixFQUE4QjtBQUNqQyxRQUFJQyxRQUFRLEdBQUdELE9BQU8sQ0FBQ1gsSUFBUixHQUNYVSxHQUFHLENBQUNHLGNBQUosQ0FBbUJGLE9BQU8sQ0FBQ1gsSUFBM0IsQ0FEVyxHQUVYQSxJQUFJLENBQUNjLElBQUwsQ0FBVUosR0FBRyxDQUFDSyxXQUFkLEVBQTJCWixPQUFPLENBQUNhLHNCQUFuQyxDQUZKO0FBSUEsUUFBSUMsRUFBRSxHQUFHakIsSUFBSSxDQUFDYyxJQUFMLENBQVVGLFFBQVYsRUFBb0IsSUFBcEIsRUFBMEIsTUFBMUIsQ0FBVDtBQUVBLFFBQUlNLEtBQUssR0FBRyxNQUFNZCxJQUFJLENBQUNlLElBQUwsQ0FBVUYsRUFBVixFQUFjO0FBQUNHLE1BQUFBLEtBQUssRUFBRTtBQUFSLEtBQWQsQ0FBbEI7QUFFQSxXQUFPaEIsSUFBSSxDQUFDaUIsVUFBTCxDQUFnQkgsS0FBaEIsRUFBdUIsTUFBTUksSUFBTixJQUFjO0FBQ3hDLFVBQUlDLFNBQVMsR0FBR3RCLE9BQU8sQ0FBQ3FCLElBQUQsQ0FBdkI7O0FBQ0EsYUFBT0MsU0FBUyxDQUFDYixHQUFELENBQWhCO0FBQ0gsS0FITSxDQUFQO0FBSUg7QUE1QlksQ0FBakIiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcblxuLyoqXG4gKiBFbmFibGUgYm9vdHN0cmFwIHNjcmlwdHNcbiAqIEBtb2R1bGUgRmVhdHVyZV9Cb290c3RyYXBcbiAqL1xuXG5jb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuY29uc3QgRmVhdHVyZSA9IHJlcXVpcmUoJy4uL2VudW0vRmVhdHVyZScpO1xuY29uc3QgTGl0ZXJhbCA9IHJlcXVpcmUoJy4uL2VudW0vTGl0ZXJhbCcpO1xuY29uc3QgVXRpbCA9IHJlcXVpcmUoJ3JrLXV0aWxzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgLyoqXG4gICAgICogVGhpcyBmZWF0dXJlIGlzIGxvYWRlZCBhdCBwbHVnaW4gc3RhZ2VcbiAgICAgKiBAbWVtYmVyIHtzdHJpbmd9XG4gICAgICovXG4gICAgdHlwZTogRmVhdHVyZS5QTFVHSU4sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIHRoZSBmZWF0dXJlXG4gICAgICogQHBhcmFtIHtBcHB9IGFwcCAtIFRoZSBjbGkgYXBwIG1vZHVsZSBvYmplY3RcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIE9wdGlvbnMgZm9yIHRoZSBmZWF0dXJlXG4gICAgICogQHByb3BlcnR5IHtzdHJpbmd9IFtvcHRpb25zLnBhdGg9J2Jvb3RzdHJhcCddIC0gVGhlIHBhdGggb2YgdGhlIGJvb3RzdHJhcCBzY3JpcHRzXG4gICAgICogQHJldHVybnMge1Byb21pc2UuPCo+fVxuICAgICAqL1xuICAgIGxvYWRfOiBhc3luYyBmdW5jdGlvbiAoYXBwLCBvcHRpb25zKSB7XG4gICAgICAgIGxldCBib290UGF0aCA9IG9wdGlvbnMucGF0aCA/XG4gICAgICAgICAgICBhcHAudG9BYnNvbHV0ZVBhdGgob3B0aW9ucy5wYXRoKSA6XG4gICAgICAgICAgICBwYXRoLmpvaW4oYXBwLndvcmtpbmdQYXRoLCBMaXRlcmFsLkRFRkFVTFRfQk9PVFNUUkFQX1BBVEgpO1xuXG4gICAgICAgIGxldCBicCA9IHBhdGguam9pbihib290UGF0aCwgJyoqJywgJyouanMnKTtcblxuICAgICAgICBsZXQgZmlsZXMgPSBhd2FpdCBVdGlsLmdsb2IoYnAsIHtub2RpcjogdHJ1ZX0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIFV0aWwuZWFjaEFzeW5jXyhmaWxlcywgYXN5bmMgZmlsZSA9PiB7XG4gICAgICAgICAgICBsZXQgYm9vdHN0cmFwID0gcmVxdWlyZShmaWxlKTtcbiAgICAgICAgICAgIHJldHVybiBib290c3RyYXAoYXBwKTtcbiAgICAgICAgfSk7XG4gICAgfVxufTsiXX0=