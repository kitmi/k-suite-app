"use strict";

require("source-map-support/register");

module.exports = {
  DEFAULT_CONFIG_PATH: 'conf',
  FEATURES_PATH: 'features',
  APP_CFG_NAME: 'app',
  DEFAULT_BOOTSTRAP_PATH: 'bootstrap',
  DEFAULT_TIMEZONE: 'Australia/Sydney'
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9lbnVtL0xpdGVyYWwuanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0cyIsIkRFRkFVTFRfQ09ORklHX1BBVEgiLCJGRUFUVVJFU19QQVRIIiwiQVBQX0NGR19OQU1FIiwiREVGQVVMVF9CT09UU1RSQVBfUEFUSCIsIkRFRkFVTFRfVElNRVpPTkUiXSwibWFwcGluZ3MiOiJBQUFBOzs7O0FBZ0JBQSxNQUFNLENBQUNDLE9BQVAsR0FBaUI7QUFJYkMsRUFBQUEsbUJBQW1CLEVBQUUsTUFKUjtBQVNiQyxFQUFBQSxhQUFhLEVBQUUsVUFURjtBQWNiQyxFQUFBQSxZQUFZLEVBQUUsS0FkRDtBQW1CYkMsRUFBQUEsc0JBQXNCLEVBQUUsV0FuQlg7QUF3QmJDLEVBQUFBLGdCQUFnQixFQUFFO0FBeEJMLENBQWpCIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qKlxuICogQ29tbW9uIGNvbnN0YW50c1xuICogQG1vZHVsZSBMaXRlcmFsXG4gKiBcbiAqIEBleGFtcGxlXG4gKiAgIGNvbnN0IExpdGVyYWwgPSByZXF1aXJlKCdAay1zdWl0ZS9jbGktYXBwci9saWIvZW51bS9MaXRlcmFsJyk7XG4gKi9cblxuLyoqXG4gKiBDb21tb24gY29uc3RhbnQgZGVmaW5pdGlvbnMuXG4gKiBAcmVhZG9ubHlcbiAqIEBlbnVtIHtzdHJpbmd9XG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgLyoqXG4gICAgICogQ29uZmlnIGZpbGVzIHBhdGhcbiAgICAgKi9cbiAgICBERUZBVUxUX0NPTkZJR19QQVRIOiAnY29uZicsICAgICAgICBcblxuICAgIC8qKlxuICAgICAqIEZlYXR1cmUgZmlsZXMgcGF0aFxuICAgICAqL1xuICAgIEZFQVRVUkVTX1BBVEg6ICdmZWF0dXJlcycsICAgIFxuXG4gICAgLyoqXG4gICAgICogQXBwIGNvbmZpZyBmaWxlIG5hbWVcbiAgICAgKi9cbiAgICBBUFBfQ0ZHX05BTUU6ICdhcHAnLFxuXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBib290cmFwIHBhdGhcbiAgICAgKi9cbiAgICBERUZBVUxUX0JPT1RTVFJBUF9QQVRIOiAnYm9vdHN0cmFwJyxcblxuICAgIC8qKlxuICAgICAqIERlZmF1bHQgdGltZXpvbmVcbiAgICAgKi9cbiAgICBERUZBVUxUX1RJTUVaT05FOiAnQXVzdHJhbGlhL1N5ZG5leSdcbn07Il19