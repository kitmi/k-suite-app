"use strict";

require("source-map-support/register");

const path = require('path');

const Feature = require('../enum/Feature');

const Util = require('rk-utils');

const {
  tryRequire
} = require('../utils/Helpers');

function translateMinimistOptions(opts) {
  let m = {};

  Util._.forOwn(opts, (detail, name) => {
    if (detail.isBool) {
      Util.putIntoBucket(m, 'boolean', name);
    } else {
      Util.putIntoBucket(m, 'string', name);
    }

    if ('default' in detail) {
      Util.setValueByPath(m, `default.${name}`, detail.default);
    }

    if (detail.alias) {
      Util.setValueByPath(m, `alias.${name}`, detail.alias);
    }
  });

  return m;
}

function optionDecorator(name) {
  return name.length == 1 ? '-' + name : '--' + name;
}

function getUsage(app, usageOptions, injects) {
  let usage = '';

  if (usageOptions.banner) {
    if (typeof usageOptions.banner === 'function') {
      usage += usageOptions.banner(app);
    } else if (typeof usageOptions.banner === 'string') {
      usage += usageOptions.banner;
    } else {
      throw new Error('Invalid banner value of cmdLineOptions feature.');
    }

    usage += '\n\n';
  }

  if (injects && injects.afterBanner) {
    usage += injects.afterBanner();
  }

  let fmtArgs = '';

  if (!Util._.isEmpty(usageOptions.arguments)) {
    fmtArgs = ' ' + usageOptions.arguments.map(arg => arg.required ? `<${arg.name}>` : `[${arg.name}]`).join(' ');
  }

  usage += `Usage: ${usageOptions.program || path.basename(process.argv[1])}${fmtArgs} [options]\n\n`;

  if (injects && injects.afterCommandLine) {
    usage += injects.afterCommandLine();
  }

  if (!Util._.isEmpty(usageOptions.options)) {
    usage += `Options:\n`;

    Util._.forOwn(usageOptions.options, (opts, name) => {
      let line = '  ' + optionDecorator(name);

      if (opts.alias) {
        line += Util._.reduce(opts.alias, (sum, a) => sum + ', ' + optionDecorator(a), '');
      }

      line += '\n';
      line += '    ' + opts.desc + '\n';

      if ('default' in opts) {
        line += '    default: ' + opts.default.toString() + '\n';
      }

      if (opts.required) {
        line += '    required\n';
      }

      line += '\n';
      usage += line;
    });
  }

  if (injects && injects.afterOptions) {
    usage += injects.afterOptions();
  }

  return usage;
}

const argv = process.argv.slice(2);

function parseArgv(options) {
  const minimist = tryRequire('minimist');
  return minimist(argv, translateMinimistOptions(options));
}

module.exports = {
  type: Feature.INIT,
  parseArgv: parseArgv,
  getUsage: getUsage,
  load_: async (app, usageOptions) => {
    app.argv = parseArgv(usageOptions.options);

    if (!Util._.isEmpty(usageOptions.arguments)) {
      let argNum = app.argv._.length;

      if (argNum < usageOptions.arguments.length) {
        let args = [];
        let diff = usageOptions.arguments.length - argNum;
        let i = 0;
        usageOptions.arguments.forEach(arg => {
          if (arg.required) {
            if (i === argNum) {
              throw new Error(`Missing required argument: "${arg.name}"!`);
            }

            args.push(app.argv._[i++]);
          } else if (diff > 0) {
            if (arg.hasOwnProperty('default')) {
              args.push(arg['default']);
            }

            diff--;
          }
        });
        app.argv._ = args;
      }
    }

    app.showUsage = () => {
      console.log(getUsage(app, usageOptions));
    };
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9mZWF0dXJlcy9jb21tYW5kTGluZU9wdGlvbnMuanMiXSwibmFtZXMiOlsicGF0aCIsInJlcXVpcmUiLCJGZWF0dXJlIiwiVXRpbCIsInRyeVJlcXVpcmUiLCJ0cmFuc2xhdGVNaW5pbWlzdE9wdGlvbnMiLCJvcHRzIiwibSIsIl8iLCJmb3JPd24iLCJkZXRhaWwiLCJuYW1lIiwiaXNCb29sIiwicHV0SW50b0J1Y2tldCIsInNldFZhbHVlQnlQYXRoIiwiZGVmYXVsdCIsImFsaWFzIiwib3B0aW9uRGVjb3JhdG9yIiwibGVuZ3RoIiwiZ2V0VXNhZ2UiLCJhcHAiLCJ1c2FnZU9wdGlvbnMiLCJpbmplY3RzIiwidXNhZ2UiLCJiYW5uZXIiLCJFcnJvciIsImFmdGVyQmFubmVyIiwiZm10QXJncyIsImlzRW1wdHkiLCJhcmd1bWVudHMiLCJtYXAiLCJhcmciLCJyZXF1aXJlZCIsImpvaW4iLCJwcm9ncmFtIiwiYmFzZW5hbWUiLCJwcm9jZXNzIiwiYXJndiIsImFmdGVyQ29tbWFuZExpbmUiLCJvcHRpb25zIiwibGluZSIsInJlZHVjZSIsInN1bSIsImEiLCJkZXNjIiwidG9TdHJpbmciLCJhZnRlck9wdGlvbnMiLCJzbGljZSIsInBhcnNlQXJndiIsIm1pbmltaXN0IiwibW9kdWxlIiwiZXhwb3J0cyIsInR5cGUiLCJJTklUIiwibG9hZF8iLCJhcmdOdW0iLCJhcmdzIiwiZGlmZiIsImkiLCJmb3JFYWNoIiwicHVzaCIsImhhc093blByb3BlcnR5Iiwic2hvd1VzYWdlIiwiY29uc29sZSIsImxvZyJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7QUFPQSxNQUFNQSxJQUFJLEdBQUdDLE9BQU8sQ0FBQyxNQUFELENBQXBCOztBQUNBLE1BQU1DLE9BQU8sR0FBR0QsT0FBTyxDQUFDLGlCQUFELENBQXZCOztBQUNBLE1BQU1FLElBQUksR0FBR0YsT0FBTyxDQUFDLFVBQUQsQ0FBcEI7O0FBQ0EsTUFBTTtBQUFFRyxFQUFBQTtBQUFGLElBQWlCSCxPQUFP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QUFHLElBQUk7QUFDbEMsY0FBSUEsR0FBRyxDQUFDQyxRQUFSLEVBQWtCO0FBQ2QsZ0JBQUkwQixDQUFDLEtBQUtILE1BQVYsRUFBa0I7QUFDZCxvQkFBTSxJQUFJOUIsS0FBSixDQUFXLCtCQUE4Qk0sR0FBRyxDQUFDcEIsSUFBSyxJQUFsRCxDQUFOO0FBQ0g7O0FBQ0Q2QyxZQUFBQSxJQUFJLENBQUNJLElBQUwsQ0FBVXhDLEdBQUcsQ0FBQ2lCLElBQUosQ0FBUzdCLENBQVQsQ0FBV2tELENBQUMsRUFBWixDQUFWO0FBQ0gsV0FMRCxNQUtPLElBQUlELElBQUksR0FBRyxDQUFYLEVBQWM7QUFDakIsZ0JBQUkxQixHQUFHLENBQUM4QixjQUFKLENBQW1CLFNBQW5CLENBQUosRUFBbUM7QUFDL0JMLGNBQUFBLElBQUksQ0FBQ0ksSUFBTCxDQUFVN0IsR0FBRyxDQUFDLFNBQUQsQ0FBYjtBQUNIOztBQUVEMEIsWUFBQUEsSUFBSTtBQUNQO0FBQ0osU0FiRDtBQWVBckMsUUFBQUEsR0FBRyxDQUFDaUIsSUFBSixDQUFTN0IsQ0FBVCxHQUFhZ0QsSUFBYjtBQUNIO0FBQ0o7O0FBRURwQyxJQUFBQSxHQUFHLENBQUMwQyxTQUFKLEdBQWdCLE1BQU07QUFDbEJDLE1BQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZN0MsUUFBUSxDQUFDQyxHQUFELEVBQU1DLFlBQU4sQ0FBcEI7QUFDSCxLQUZEO0FBR0g7QUF2RFksQ0FBakIiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcblxuLyoqXG4gKiBQYXJzZSBjb21tYW5kIGxpbmUgYXJndW1lbnRzIHVzaW5nIG1pbmltaXN0IGFuZCBzdG9yZSB0aGUgcGFyc2VkIG9iamVjdCBpbnRvIGFwcC5hcmd2LCBhbmQgYWRkIGFwcC5zaG93VXNhZ2UoKSBoZWxwZXIgZnVuY3Rpb25cbiAqIEBtb2R1bGUgRmVhdHVyZV9Db21tYW5kTGluZU9wdGlvbnNcbiAqL1xuXG5jb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuY29uc3QgRmVhdHVyZSA9IHJlcXVpcmUoJy4uL2VudW0vRmVhdHVyZScpO1xuY29uc3QgVXRpbCA9IHJlcXVpcmUoJ3JrLXV0aWxzJyk7XG5jb25zdCB7IHRyeVJlcXVpcmUgfSA9IHJlcXVpcmUoJy4uL3V0aWxzL0hlbHBlcnMnKTtcblxuZnVuY3Rpb24gdHJhbnNsYXRlTWluaW1pc3RPcHRpb25zKG9wdHMpIHtcbiAgICBsZXQgbSA9IHt9O1xuXG4gICAgVXRpbC5fLmZvck93bihvcHRzLCAoZGV0YWlsLCBuYW1lKSA9PiB7XG4gICAgICAgIGlmIChkZXRhaWwuaXNCb29sKSB7XG4gICAgICAgICAgICBVdGlsLnB1dEludG9CdWNrZXQobSwgJ2Jvb2xlYW4nLCBuYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFV0aWwucHV0SW50b0J1Y2tldChtLCAnc3RyaW5nJywgbmFtZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJ2RlZmF1bHQnIGluIGRldGFpbCkge1xuICAgICAgICAgICAgVXRpbC5zZXRWYWx1ZUJ5UGF0aChtLCBgZGVmYXVsdC4ke25hbWV9YCwgZGV0YWlsLmRlZmF1bHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRldGFpbC5hbGlhcykge1xuICAgICAgICAgICAgVXRpbC5zZXRWYWx1ZUJ5UGF0aChtLCBgYWxpYXMuJHtuYW1lfWAsIGRldGFpbC5hbGlhcyk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBtO1xufVxuXG5mdW5jdGlvbiBvcHRpb25EZWNvcmF0b3IobmFtZSkge1xuICAgIHJldHVybiBuYW1lLmxlbmd0aCA9PSAxID8gKCctJyArIG5hbWUpIDogKCctLScgKyBuYW1lKTtcbn1cblxuZnVuY3Rpb24gZ2V0VXNhZ2UoYXBwLCB1c2FnZU9wdGlvbnMsIGluamVjdHMpIHtcbiAgICBsZXQgdXNhZ2UgPSAnJztcblxuICAgIGlmICh1c2FnZU9wdGlvbnMuYmFubmVyKSB7XG4gICAgICAgIGlmICh0eXBlb2YgdXNhZ2VPcHRpb25zLmJhbm5lciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdXNhZ2UgKz0gdXNhZ2VPcHRpb25zLmJhbm5lcihhcHApO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB1c2FnZU9wdGlvbnMuYmFubmVyID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdXNhZ2UgKz0gdXNhZ2VPcHRpb25zLmJhbm5lcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBiYW5uZXIgdmFsdWUgb2YgY21kTGluZU9wdGlvbnMgZmVhdHVyZS4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHVzYWdlICs9ICdcXG5cXG4nO1xuICAgIH0gICAgICAgICAgICBcblxuICAgIGlmIChpbmplY3RzICYmIGluamVjdHMuYWZ0ZXJCYW5uZXIpIHtcbiAgICAgICAgdXNhZ2UgKz0gaW5qZWN0cy5hZnRlckJhbm5lcigpO1xuICAgIH1cblxuICAgIGxldCBmbXRBcmdzID0gJyc7XG4gICAgaWYgKCFVdGlsLl8uaXNFbXB0eSh1c2FnZU9wdGlvbnMuYXJndW1lbnRzKSkge1xuICAgICAgICBmbXRBcmdzID0gJyAnICsgdXNhZ2VPcHRpb25zLmFyZ3VtZW50cy5tYXAoYXJnID0+IGFyZy5yZXF1aXJlZCA/IGA8JHthcmcubmFtZX0+YCA6IGBbJHthcmcubmFtZX1dYCkuam9pbignICcpO1xuICAgIH1cblxuICAgIHVzYWdlICs9IGBVc2FnZTogJHt1c2FnZU9wdGlvbnMucHJvZ3JhbSB8fCBwYXRoLmJhc2VuYW1lKHByb2Nlc3MuYXJndlsxXSl9JHtmbXRBcmdzfSBbb3B0aW9uc11cXG5cXG5gO1xuXG4gICAgaWYgKGluamVjdHMgJiYgaW5qZWN0cy5hZnRlckNvbW1hbmRMaW5lKSB7XG4gICAgICAgIHVzYWdlICs9IGluamVjdHMuYWZ0ZXJDb21tYW5kTGluZSgpO1xuICAgIH0gXG4gICAgXG4gICAgaWYgKCFVdGlsLl8uaXNFbXB0eSh1c2FnZU9wdGlvbnMub3B0aW9ucykpIHtcbiAgICAgICAgdXNhZ2UgKz0gYE9wdGlvbnM6XFxuYDtcbiAgICAgICAgVXRpbC5fLmZvck93bih1c2FnZU9wdGlvbnMub3B0aW9ucywgKG9wdHMsIG5hbWUpID0+IHtcbiAgICAgICAgICAgIGxldCBsaW5lID0gJyAgJyArIG9wdGlvbkRlY29yYXRvcihuYW1lKTtcbiAgICAgICAgICAgIGlmIChvcHRzLmFsaWFzKSB7XG4gICAgICAgICAgICAgICAgbGluZSArPSBVdGlsLl8ucmVkdWNlKG9wdHMuYWxpYXMsIChzdW0sIGEpID0+IChzdW0gKyAnLCAnICsgb3B0aW9uRGVjb3JhdG9yKGEpKSwgJycpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsaW5lICs9ICdcXG4nO1xuICAgICAgICAgICAgbGluZSArPSAnICAgICcgKyBvcHRzLmRlc2MgKyAnXFxuJztcblxuICAgICAgICAgICAgaWYgKCdkZWZhdWx0JyBpbiBvcHRzKSB7XG4gICAgICAgICAgICAgICAgbGluZSArPSAnICAgIGRlZmF1bHQ6ICcgKyBvcHRzLmRlZmF1bHQudG9TdHJpbmcoKSArICdcXG4nO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAob3B0cy5yZXF1aXJlZCkge1xuICAgICAgICAgICAgICAgIGxpbmUgKz0gJyAgICByZXF1aXJlZFxcbic7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxpbmUgKz0gJ1xcbic7XG5cbiAgICAgICAgICAgIHVzYWdlICs9IGxpbmU7XG4gICAgICAgIH0pO1xuICAgIH0gICAgICAgIFxuXG4gICAgaWYgKGluamVjdHMgJiYgaW5qZWN0cy5hZnRlck9wdGlvbnMpIHtcbiAgICAgICAgdXNhZ2UgKz0gaW5qZWN0cy5hZnRlck9wdGlvbnMoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdXNhZ2U7XG59XG5cbmNvbnN0IGFyZ3YgPSBwcm9jZXNzLmFyZ3Yuc2xpY2UoMik7XG5cbmZ1bmN0aW9uIHBhcnNlQXJndihvcHRpb25zKSB7XG4gICAgY29uc3QgbWluaW1pc3QgPSB0cnlSZXF1aXJlKCdtaW5pbWlzdCcpO1xuICAgIHJldHVybiBtaW5pbWlzdChhcmd2LCB0cmFuc2xhdGVNaW5pbWlzdE9wdGlvbnMob3B0aW9ucykpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAvKipcbiAgICAgKiBUaGlzIGZlYXR1cmUgaXMgbG9hZGVkIGF0IGNvbmZpZ3VyYXRpb24gc3RhZ2VcbiAgICAgKiBAbWVtYmVyIHtzdHJpbmd9XG4gICAgICovXG4gICAgdHlwZTogRmVhdHVyZS5JTklULFxuXG4gICAgcGFyc2VBcmd2OiBwYXJzZUFyZ3YsXG5cbiAgICBnZXRVc2FnZTogZ2V0VXNhZ2UsXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIHRoZSBmZWF0dXJlXG4gICAgICogQHBhcmFtIHtBcHB9IGFwcCAtIFRoZSBjbGkgYXBwIG1vZHVsZSBvYmplY3RcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gdXNhZ2VPcHRpb25zIC0gT3B0aW9ucyBmb3IgdGhlIGZlYXR1cmUgICAgIFxuICAgICAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBbdXNhZ2VPcHRpb25zLmJhbm5lcl0gLSBCYW5uZXIgbWVzc2FnZSBvciBiYW5uZXIgZ2VuZXJhdG9yIGZ1bmN0aW9uXG4gICAgICogQHByb3BlcnR5IHtzdHJpbmd9IFt1c2FnZU9wdGlvbnMucHJvZ3JhbV0gLSBFeGVjdXRhYmxlIG5hbWVcbiAgICAgKiBAcHJvcGVydHkge2FycmF5fSBbdXNhZ2VPcHRpb25zLmFyZ3VtZW50c10gLSBDb21tYW5kIGxpbmUgYXJndW1lbnRzLCBpZGVudGlmaWVkIGJ5IHRoZSBwb3NpdGlvbiBvZiBhcHBlYXJhbmNlXG4gICAgICogQHByb3BlcnR5IHtvYmplY3R9IFt1c2FnZU9wdGlvbnMub3B0aW9uc10gLSBDb21tYW5kIGxpbmUgb3B0aW9uc1xuICAgICAqIEByZXR1cm5zIHtQcm9taXNlLjwqPn1cbiAgICAgKi9cbiAgICBsb2FkXzogYXN5bmMgKGFwcCwgdXNhZ2VPcHRpb25zKSA9PiB7ICAgICAgICBcbiAgICAgICAgYXBwLmFyZ3YgPSBwYXJzZUFyZ3YodXNhZ2VPcHRpb25zLm9wdGlvbnMpO1xuXG4gICAgICAgIGlmICghVXRpbC5fLmlzRW1wdHkodXNhZ2VPcHRpb25zLmFyZ3VtZW50cykpIHsgICAgIFxuICAgICAgICAgICAgbGV0IGFyZ051bSA9IGFwcC5hcmd2Ll8ubGVuZ3RoO1xuXG4gICAgICAgICAgICBpZiAoYXJnTnVtIDwgdXNhZ2VPcHRpb25zLmFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBsZXQgYXJncyA9IFtdO1xuXG4gICAgICAgICAgICAgICAgbGV0IGRpZmYgPSB1c2FnZU9wdGlvbnMuYXJndW1lbnRzLmxlbmd0aCAtIGFyZ051bTtcbiAgICAgICAgICAgICAgICBsZXQgaSA9IDA7XG5cbiAgICAgICAgICAgICAgICB1c2FnZU9wdGlvbnMuYXJndW1lbnRzLmZvckVhY2goYXJnID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFyZy5yZXF1aXJlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGkgPT09IGFyZ051bSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBhcmd1bWVudDogXCIke2FyZy5uYW1lfVwiIWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYXJncy5wdXNoKGFwcC5hcmd2Ll9baSsrXSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZGlmZiA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmcuaGFzT3duUHJvcGVydHkoJ2RlZmF1bHQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MucHVzaChhcmdbJ2RlZmF1bHQnXSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBkaWZmLS07XG4gICAgICAgICAgICAgICAgICAgIH0gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgYXBwLmFyZ3YuXyA9IGFyZ3M7XG4gICAgICAgICAgICB9ICAgICAgICAgICAgXG4gICAgICAgIH0gICAgICAgIFxuXG4gICAgICAgIGFwcC5zaG93VXNhZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhnZXRVc2FnZShhcHAsIHVzYWdlT3B0aW9ucykpO1xuICAgICAgICB9XG4gICAgfVxufTsiXX0=