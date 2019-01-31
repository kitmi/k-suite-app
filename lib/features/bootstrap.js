"use strict";

require("source-map-support/register");

const path = require('path');

const Feature = require('../enum/Feature');

const Literal = require('../enum/Literal');

const Util = require('rk-utils');

module.exports = {
  type: Feature.INIT,
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9mZWF0dXJlcy9ib290c3RyYXAuanMiXSwibmFtZXMiOlsicGF0aCIsInJlcXVpcmUiLCJGZWF0dXJlIiwiTGl0ZXJhbCIsIlV0aWwiLCJtb2R1bGUiLCJleHBvcnRzIiwidHlwZSIsIklOSVQiLCJsb2FkXyIsImFwcCIsIm9wdGlvbnMiLCJib290UGF0aCIsInRvQWJzb2x1dGVQYXRoIiwiam9pbiIsIndvcmtpbmdQYXRoIiwiREVGQVVMVF9CT09UU1RSQVBfUEFUSCIsImJwIiwiZmlsZXMiLCJnbG9iIiwibm9kaXIiLCJlYWNoQXN5bmNfIiwiZmlsZSIsImJvb3RzdHJhcCJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7QUFPQSxNQUFNQSxJQUFJLEdBQUdDLE9BQU8sQ0FBQyxNQUFELENBQXBCOztBQUNBLE1BQU1DLE9BQU8sR0FBR0QsT0FBTyxDQUFDLGlCQUFELENBQXZCOztBQUNBLE1BQU1FLE9BQU8sR0FBR0YsT0FBTyxDQUFDLGlCQUFELENBQXZCOztBQUNBLE1BQU1HLElBQUksR0FBR0gsT0FBTyxDQUFDLFVBQUQsQ0FBcEI7O0FBRUFJLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQjtBQU1iQyxFQUFBQSxJQUFJLEVBQUVMLE9BQU8sQ0FBQ00sSUFORDtBQWViQyxFQUFBQSxLQUFLLEVBQUUsZ0JBQWdCQyxHQUFoQixFQUFxQkMsT0FBckIsRUFBOEI7QUFDakMsUUFBSUMsUUFBUSxHQUFHRCxPQUFPLENBQUNYLElBQVIsR0FDWFUsR0FBRyxDQUFDRyxjQUFKLENBQW1CRixPQUFPLENBQUNYLElBQTNCLENBRFcsR0FFWEEsSUFBSSxDQUFDYyxJQUFMLENBQVVKLEdBQUcsQ0FBQ0ssV0FBZCxFQUEyQlosT0FBTyxDQUFDYSxzQkFBbkMsQ0FGSjtBQUlBLFFBQUlDLEVBQUUsR0FBR2pCLElBQUksQ0FBQ2MsSUFBTCxDQUFVRixRQUFWLEVBQW9CLElBQXBCLEVBQTBCLE1BQTFCLENBQVQ7QUFFQSxRQUFJTSxLQUFLLEdBQUcsTUFBTWQsSUFBSSxDQUFDZSxJQUFMLENBQVVGLEVBQVYsRUFBYztBQUFDRyxNQUFBQSxLQUFLLEVBQUU7QUFBUixLQUFkLENBQWxCO0FBRUEsV0FBT2hCLElBQUksQ0FBQ2lCLFVBQUwsQ0FBZ0JILEtBQWhCLEVBQXVCLE1BQU1JLElBQU4sSUFBYztBQUN4QyxVQUFJQyxTQUFTLEdBQUd0QixPQUFPLENBQUNxQixJQUFELENBQXZCOztBQUNBLGFBQU9DLFNBQVMsQ0FBQ2IsR0FBRCxDQUFoQjtBQUNILEtBSE0sQ0FBUDtBQUlIO0FBNUJZLENBQWpCIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qKlxuICogRW5hYmxlIGJvb3RzdHJhcCBzY3JpcHRzXG4gKiBAbW9kdWxlIEZlYXR1cmVfQm9vdHN0cmFwXG4gKi9cblxuY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbmNvbnN0IEZlYXR1cmUgPSByZXF1aXJlKCcuLi9lbnVtL0ZlYXR1cmUnKTtcbmNvbnN0IExpdGVyYWwgPSByZXF1aXJlKCcuLi9lbnVtL0xpdGVyYWwnKTtcbmNvbnN0IFV0aWwgPSByZXF1aXJlKCdyay11dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIC8qKlxuICAgICAqIFRoaXMgZmVhdHVyZSBpcyBsb2FkZWQgYXQgaW5pdCBzdGFnZVxuICAgICAqIEBtZW1iZXIge3N0cmluZ31cbiAgICAgKi9cbiAgICB0eXBlOiBGZWF0dXJlLklOSVQsXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIHRoZSBmZWF0dXJlXG4gICAgICogQHBhcmFtIHtBcHB9IGFwcCAtIFRoZSBjbGkgYXBwIG1vZHVsZSBvYmplY3RcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIE9wdGlvbnMgZm9yIHRoZSBmZWF0dXJlXG4gICAgICogQHByb3BlcnR5IHtzdHJpbmd9IFtvcHRpb25zLnBhdGg9J2Jvb3N0cmFwJ10gLSBUaGUgcGF0aCBvZiB0aGUgYm9vdHN0cmFwIHNjcmlwdHNcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZS48Kj59XG4gICAgICovXG4gICAgbG9hZF86IGFzeW5jIGZ1bmN0aW9uIChhcHAsIG9wdGlvbnMpIHtcbiAgICAgICAgbGV0IGJvb3RQYXRoID0gb3B0aW9ucy5wYXRoID9cbiAgICAgICAgICAgIGFwcC50b0Fic29sdXRlUGF0aChvcHRpb25zLnBhdGgpIDpcbiAgICAgICAgICAgIHBhdGguam9pbihhcHAud29ya2luZ1BhdGgsIExpdGVyYWwuREVGQVVMVF9CT09UU1RSQVBfUEFUSCk7XG5cbiAgICAgICAgbGV0IGJwID0gcGF0aC5qb2luKGJvb3RQYXRoLCAnKionLCAnKi5qcycpO1xuXG4gICAgICAgIGxldCBmaWxlcyA9IGF3YWl0IFV0aWwuZ2xvYihicCwge25vZGlyOiB0cnVlfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gVXRpbC5lYWNoQXN5bmNfKGZpbGVzLCBhc3luYyBmaWxlID0+IHtcbiAgICAgICAgICAgIGxldCBib290c3RyYXAgPSByZXF1aXJlKGZpbGUpO1xuICAgICAgICAgICAgcmV0dXJuIGJvb3RzdHJhcChhcHApO1xuICAgICAgICB9KTtcbiAgICB9XG59OyJdfQ==