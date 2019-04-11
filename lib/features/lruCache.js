"use strict";

require("source-map-support/register");

const Feature = require('../enum/Feature');

const {
  tryRequire
} = require('../utils/Helpers');

const {
  _
} = require('rk-utils');

module.exports = {
  type: Feature.SERVICE,
  load_: (app, resourceOptions) => {
    let LRU = tryRequire('lru-cache');

    if (resourceOptions.resources) {
      _.map(resourceOptions.resources, (options, resource) => {
        let cache = new LRU(options);
        app.registerService('lruCache:' + resource, cache);
      });
    }

    const cacheService = {
      res: resource => {
        let key = 'lruCache:' + resource;
        let cache = app.getService(key);
        if (cache) return cache;
        let options = resourceOptions["default"] || {
          max: 0
        };

        if (resourceOptions.resources && resource in resourceOptions.resources) {
          options = { ...options,
            ...resourceOptions.resources[resource]
          };
        }

        cache = new LRU(options);
        app.registerService(key, cache);
        return cache;
      },
      reset: resource => {
        let cache = cacheService.res(resource);
        cache.reset();
        return cache;
      }
    };
    app.registerService('lruCache', cacheService);
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9mZWF0dXJlcy9scnVDYWNoZS5qcyJdLCJuYW1lcyI6WyJGZWF0dXJlIiwicmVxdWlyZSIsInRyeVJlcXVpcmUiLCJfIiwibW9kdWxlIiwiZXhwb3J0cyIsInR5cGUiLCJTRVJWSUNFIiwibG9hZF8iLCJhcHAiLCJyZXNvdXJjZU9wdGlvbnMiLCJMUlUiLCJyZXNvdXJjZXMiLCJtYXAiLCJvcHRpb25zIiwicmVzb3VyY2UiLCJjYWNoZSIsInJlZ2lzdGVyU2VydmljZSIsImNhY2hlU2VydmljZSIsInJlcyIsImtleSIsImdldFNlcnZpY2UiLCJtYXgiLCJyZXNldCJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7QUFPQSxNQUFNQSxPQUFPLEdBQUdDLE9BQU8sQ0FBQyxpQkFBRCxDQUF2Qjs7QUFDQSxNQUFNO0FBQUVDLEVBQUFBO0FBQUYsSUFBaUJELE9BQU8sQ0FBQyxrQkFBRCxDQUE5Qjs7QUFDQSxNQUFNO0FBQUVFLEVBQUFBO0FBQUYsSUFBUUYsT0FBTyxDQUFDLFVBQUQsQ0FBckI7O0FBRUFHLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQjtBQU1iQyxFQUFBQSxJQUFJLEVBQUVOLE9BQU8sQ0FBQ08sT0FORDtBQWdCYkMsRUFBQUEsS0FBSyxFQUFFLENBQUNDLEdBQUQsRUFBTUMsZUFBTixLQUEwQjtBQUM3QixRQUFJQyxHQUFHLEdBQUdULFVBQVUsQ0FBQyxXQUFELENBQXBCOztBQUdBLFFBQUlRLGVBQWUsQ0FBQ0UsU0FBcEIsRUFBK0I7QUFDM0JULE1BQUFBLENBQUMsQ0FBQ1UsR0FBRixDQUFNSCxlQUFlLENBQUNFLFNBQXRCLEVBQWlDLENBQUNFLE9BQUQsRUFBVUMsUUFBVixLQUF1QjtBQUNwRCxZQUFJQyxLQUFLLEdBQUcsSUFBSUwsR0FBSixDQUFRRyxPQUFSLENBQVo7QUFDQUwsUUFBQUEsR0FBRyxDQUFDUSxlQUFKLENBQW9CLGNBQWNGLFFBQWxDLEVBQTRDQyxLQUE1QztBQUNILE9BSEQ7QUFJSDs7QUFFRCxVQUFNRSxZQUFZLEdBQUc7QUFDakJDLE1BQUFBLEdBQUcsRUFBR0osUUFBRCxJQUFjO0FBQ2YsWUFBSUssR0FBRyxHQUFHLGNBQWNMLFFBQXhCO0FBQ0EsWUFBSUMsS0FBSyxHQUFHUCxHQUFHLENBQUNZLFVBQUosQ0FBZUQsR0FBZixDQUFaO0FBQ0EsWUFBSUosS0FBSixFQUFXLE9BQU9BLEtBQVA7QUFFWCxZQUFJRixPQUFPLEdBQUdKLGVBQWUsQ0FBQyxTQUFELENBQWYsSUFBOEI7QUFBRVksVUFBQUEsR0FBRyxFQUFFO0FBQVAsU0FBNUM7O0FBRUEsWUFBSVosZUFBZSxDQUFDRSxTQUFoQixJQUE4QkcsUUFBUSxJQUFJTCxlQUFlLENBQUNFLFNBQTlELEVBQTBFO0FBQ3RFRSxVQUFBQSxPQUFPLEdBQUcsRUFBRSxHQUFHQSxPQUFMO0FBQWMsZUFBR0osZUFBZSxDQUFDRSxTQUFoQixDQUEwQkcsUUFBMUI7QUFBakIsV0FBVjtBQUNIOztBQUVEQyxRQUFBQSxLQUFLLEdBQUcsSUFBSUwsR0FBSixDQUFRRyxPQUFSLENBQVI7QUFDQUwsUUFBQUEsR0FBRyxDQUFDUSxlQUFKLENBQW9CRyxHQUFwQixFQUF5QkosS0FBekI7QUFDQSxlQUFPQSxLQUFQO0FBQ0gsT0FmZ0I7QUFpQmpCTyxNQUFBQSxLQUFLLEVBQUdSLFFBQUQsSUFBYztBQUNqQixZQUFJQyxLQUFLLEdBQUdFLFlBQVksQ0FBQ0MsR0FBYixDQUFpQkosUUFBakIsQ0FBWjtBQUNBQyxRQUFBQSxLQUFLLENBQUNPLEtBQU47QUFDQSxlQUFPUCxLQUFQO0FBQ0g7QUFyQmdCLEtBQXJCO0FBd0JBUCxJQUFBQSxHQUFHLENBQUNRLGVBQUosQ0FBb0IsVUFBcEIsRUFBZ0NDLFlBQWhDO0FBQ0g7QUFwRFksQ0FBakIiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcblxuLyoqXG4gKiBFbmFibGUgTFJVIGNhY2hlIGZlYXR1cmVcbiAqIEBtb2R1bGUgRmVhdHVyZV9McnVDYWNoZVxuICovXG5cbmNvbnN0IEZlYXR1cmUgPSByZXF1aXJlKCcuLi9lbnVtL0ZlYXR1cmUnKTtcbmNvbnN0IHsgdHJ5UmVxdWlyZSB9ID0gcmVxdWlyZSgnLi4vdXRpbHMvSGVscGVycycpO1xuY29uc3QgeyBfIH0gPSByZXF1aXJlKCdyay11dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIC8qKlxuICAgICAqIFRoaXMgZmVhdHVyZSBpcyBsb2FkZWQgYXQgc2VydmljZSBzdGFnZVxuICAgICAqIEBtZW1iZXIge3N0cmluZ31cbiAgICAgKi9cbiAgICB0eXBlOiBGZWF0dXJlLlNFUlZJQ0UsXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIHRoZSBmZWF0dXJlXG4gICAgICogQHBhcmFtIHtBcHB9IGFwcCAtIFRoZSBhcHAgbW9kdWxlIG9iamVjdFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNvdXJjZU9wdGlvbnMgLSBUaGUgY2FjaGUgb3B0aW9ucyBmb3Igc3BlY2lmaWVkIHJlc291cmNlXG4gICAgICogQHByb3BlcnR5IHtvYmplY3R9IFtyZXNvdXJjZU9wdGlvbnMuZGVmYXVsdF0gLSBEZWZhdWx0IG9wdGlvbnMsIHdpbGwgYmUgb3ZlcnJpZGVkIGJ5IHJlc291cmNlLXNwZWNpZmljIG9wdGlvbnMgaWYgYW55XG4gICAgICogQHByb3BlcnR5IHtvYmplY3R9IFtyZXNvdXJjZU9wdGlvbnMucmVzb3VyY2VzXSAtIFJlc291cmNlLXNwZWNpZmljIG9wdGlvbnNcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZS48Kj59XG4gICAgICovXG4gICAgbG9hZF86IChhcHAsIHJlc291cmNlT3B0aW9ucykgPT4ge1xuICAgICAgICBsZXQgTFJVID0gdHJ5UmVxdWlyZSgnbHJ1LWNhY2hlJyk7XG5cbiAgICAgICAgLy9wcmUtY3JlYXRlXG4gICAgICAgIGlmIChyZXNvdXJjZU9wdGlvbnMucmVzb3VyY2VzKSB7XG4gICAgICAgICAgICBfLm1hcChyZXNvdXJjZU9wdGlvbnMucmVzb3VyY2VzLCAob3B0aW9ucywgcmVzb3VyY2UpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgY2FjaGUgPSBuZXcgTFJVKG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGFwcC5yZWdpc3RlclNlcnZpY2UoJ2xydUNhY2hlOicgKyByZXNvdXJjZSwgY2FjaGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjYWNoZVNlcnZpY2UgPSB7XG4gICAgICAgICAgICByZXM6IChyZXNvdXJjZSkgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBrZXkgPSAnbHJ1Q2FjaGU6JyArIHJlc291cmNlO1xuICAgICAgICAgICAgICAgIGxldCBjYWNoZSA9IGFwcC5nZXRTZXJ2aWNlKGtleSk7XG4gICAgICAgICAgICAgICAgaWYgKGNhY2hlKSByZXR1cm4gY2FjaGU7XG5cbiAgICAgICAgICAgICAgICBsZXQgb3B0aW9ucyA9IHJlc291cmNlT3B0aW9uc1tcImRlZmF1bHRcIl0gfHwgeyBtYXg6IDAgfTtcblxuICAgICAgICAgICAgICAgIGlmIChyZXNvdXJjZU9wdGlvbnMucmVzb3VyY2VzICYmIChyZXNvdXJjZSBpbiByZXNvdXJjZU9wdGlvbnMucmVzb3VyY2VzKSkge1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zID0geyAuLi5vcHRpb25zLCAuLi5yZXNvdXJjZU9wdGlvbnMucmVzb3VyY2VzW3Jlc291cmNlXSB9O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNhY2hlID0gbmV3IExSVShvcHRpb25zKTtcbiAgICAgICAgICAgICAgICBhcHAucmVnaXN0ZXJTZXJ2aWNlKGtleSwgY2FjaGUpO1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWNoZTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHJlc2V0OiAocmVzb3VyY2UpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgY2FjaGUgPSBjYWNoZVNlcnZpY2UucmVzKHJlc291cmNlKTtcbiAgICAgICAgICAgICAgICBjYWNoZS5yZXNldCgpO1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWNoZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGFwcC5yZWdpc3RlclNlcnZpY2UoJ2xydUNhY2hlJywgY2FjaGVTZXJ2aWNlKTtcbiAgICB9XG59OyJdfQ==