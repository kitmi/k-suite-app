"use strict";

require("source-map-support/register");

module.exports = {
  DEFAULT_CONFIG_PATH: 'conf',
  FEATURES_PATH: 'features',
  APP_CFG_NAME: 'app',
  DEFAULT_BOOTSTRAP_PATH: 'bootstrap',
  DEFAULT_TIMEZONE: 'Australia/Sydney',
  MODELS_PATH: 'models'
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9lbnVtL0xpdGVyYWwuanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0cyIsIkRFRkFVTFRfQ09ORklHX1BBVEgiLCJGRUFUVVJFU19QQVRIIiwiQVBQX0NGR19OQU1FIiwiREVGQVVMVF9CT09UU1RSQVBfUEFUSCIsIkRFRkFVTFRfVElNRVpPTkUiLCJNT0RFTFNfUEFUSCJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7QUFnQkFBLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQjtBQUliQyxFQUFBQSxtQkFBbUIsRUFBRSxNQUpSO0FBU2JDLEVBQUFBLGFBQWEsRUFBRSxVQVRGO0FBY2JDLEVBQUFBLFlBQVksRUFBRSxLQWREO0FBbUJiQyxFQUFBQSxzQkFBc0IsRUFBRSxXQW5CWDtBQXdCYkMsRUFBQUEsZ0JBQWdCLEVBQUUsa0JBeEJMO0FBNkJiQyxFQUFBQSxXQUFXLEVBQUU7QUE3QkEsQ0FBakIiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcblxuLyoqXG4gKiBDb21tb24gY29uc3RhbnRzXG4gKiBAbW9kdWxlIExpdGVyYWxcbiAqIFxuICogQGV4YW1wbGVcbiAqICAgY29uc3QgTGl0ZXJhbCA9IHJlcXVpcmUoJ0BrLXN1aXRlL2NsaS1hcHByL2xpYi9lbnVtL0xpdGVyYWwnKTtcbiAqL1xuXG4vKipcbiAqIENvbW1vbiBjb25zdGFudCBkZWZpbml0aW9ucy5cbiAqIEByZWFkb25seVxuICogQGVudW0ge3N0cmluZ31cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAvKipcbiAgICAgKiBDb25maWcgZmlsZXMgcGF0aFxuICAgICAqL1xuICAgIERFRkFVTFRfQ09ORklHX1BBVEg6ICdjb25mJywgICAgICAgIFxuXG4gICAgLyoqXG4gICAgICogRmVhdHVyZSBmaWxlcyBwYXRoXG4gICAgICovXG4gICAgRkVBVFVSRVNfUEFUSDogJ2ZlYXR1cmVzJywgICAgXG5cbiAgICAvKipcbiAgICAgKiBBcHAgY29uZmlnIGZpbGUgbmFtZVxuICAgICAqL1xuICAgIEFQUF9DRkdfTkFNRTogJ2FwcCcsXG5cbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IGJvb3RyYXAgcGF0aFxuICAgICAqL1xuICAgIERFRkFVTFRfQk9PVFNUUkFQX1BBVEg6ICdib290c3RyYXAnLFxuXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCB0aW1lem9uZVxuICAgICAqL1xuICAgIERFRkFVTFRfVElNRVpPTkU6ICdBdXN0cmFsaWEvU3lkbmV5JywgICAgXG5cbiAgICAvKipcbiAgICAgKiBNb2RlbHMgZmlsZXMgcGF0aCwgdW5kZXIgYmFja2VuZCBmb2xkZXJcbiAgICAgKi9cbiAgICBNT0RFTFNfUEFUSDogJ21vZGVscydcbn07Il19