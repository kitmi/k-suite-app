"use strict";

require("source-map-support/register");

const {
  _
} = require('rk-utils');

const Feature = require('../enum/Feature');

const {
  tryRequire
} = require('../utils/Helpers');

const basicAuth = (req, authInfo) => {
  req.auth(authInfo.username, authInfo.password);
};

const bearerAuth = (req, authInfo) => {
  req.set('Authorization', `Bearer ${authInfo}`);
};

class SimpleCrawler {
  constructor(settings) {
    this.agent = tryRequire('superagent');

    if (settings.saveCookies) {
      this.agent = this.agent.agent();
    }

    let timeout = {
      response: 5000,
      deadline: 60000
    };

    if (settings.responseTimeout) {
      timeout.response = settings.responseTimeout;
    }

    if (settings.deadlineTimeout) {
      timeout.deadline = settings.deadlineTimeout;
    }

    if (settings.parser) {
      if (settings.parser === 'cheerio') {
        let parser = tryRequire('cheerio');

        this._afterReceive = text => {
          return parser.load(text);
        };
      }
    }

    this._beforeSend = req => {
      req.timeout(timeout);

      if (settings.basicAuth) {
        basicAuth(req, settings.basicAuth);
      } else if (settings.bearerAuth) {
        bearerAuth(req, settings.bearerAuth);
      }
    };
  }

  async _sendRequest_(req) {
    this._beforeSend(req);

    req.buffer(true);

    try {
      let res = await req;
      return this._afterReceive ? this._afterReceive(res.text) : res.text;
    } catch (error) {
      if (this.onErrorHandler) {
        await this.onErrorHandler(error);
      }

      if (error.response) {
        let {
          status,
          body,
          text
        } = error.response;
        let message = body && body.error || error.response.error && error.response.error.message || text;
        error.message = message;
        error.status = status;
      }

      throw error;
    }
  }

  async get_(url, query) {
    let req = this.agent.get(url);

    if (query) {
      req.query(query);
    }

    return this._sendRequest_(req);
  }

  async post_(url, query, body) {
    let req = this.agent.post(url);

    if (query) {
      req.query(query);
    }

    if (body) {
      req.send(body);
    }

    return this._sendRequest_(req);
  }

}

module.exports = {
  type: Feature.PLUGIN,
  load_: async function (app, settings) {
    let client = new SimpleCrawler(settings);
    app.registerService('simpleCrawler', client);
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9mZWF0dXJlcy9zaW1wbGVDcmF3bGVyLmpzIl0sIm5hbWVzIjpbIl8iLCJyZXF1aXJlIiwiRmVhdHVyZSIsInRyeVJlcXVpcmUiLCJiYXNpY0F1dGgiLCJyZXEiLCJhdXRoSW5mbyIsImF1dGgiLCJ1c2VybmFtZSIsInBhc3N3b3JkIiwiYmVhcmVyQXV0aCIsInNldCIsIlNpbXBsZUNyYXdsZXIiLCJjb25zdHJ1Y3RvciIsInNldHRpbmdzIiwiYWdlbnQiLCJzYXZlQ29va2llcyIsInRpbWVvdXQiLCJyZXNwb25zZSIsImRlYWRsaW5lIiwicmVzcG9uc2VUaW1lb3V0IiwiZGVhZGxpbmVUaW1lb3V0IiwicGFyc2VyIiwiX2FmdGVyUmVjZWl2ZSIsInRleHQiLCJsb2FkIiwiX2JlZm9yZVNlbmQiLCJfc2VuZFJlcXVlc3RfIiwiYnVmZmVyIiwicmVzIiwiZXJyb3IiLCJvbkVycm9ySGFuZGxlciIsInN0YXR1cyIsImJvZHkiLCJtZXNzYWdlIiwiZ2V0XyIsInVybCIsInF1ZXJ5IiwiZ2V0IiwicG9zdF8iLCJwb3N0Iiwic2VuZCIsIm1vZHVsZSIsImV4cG9ydHMiLCJ0eXBlIiwiUExVR0lOIiwibG9hZF8iLCJhcHAiLCJjbGllbnQiLCJyZWdpc3RlclNlcnZpY2UiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSxNQUFNO0FBQUVBLEVBQUFBO0FBQUYsSUFBUUMsT0FBTyxDQUFDLFVBQUQsQ0FBckI7O0FBQ0EsTUFBTUMsT0FBTyxHQUFHRCxPQUFPLENBQUMsaUJBQUQsQ0FBdkI7O0FBQ0EsTUFBTTtBQUFFRSxFQUFBQTtBQUFGLElBQWlCRixPQUFPLENBQUMsa0JBQUQsQ0FBOUI7O0FBRUEsTUFBTUcsU0FBUyxHQUFHLENBQUNDLEdBQUQsRUFBTUMsUUFBTixLQUFtQjtBQUNqQ0QsRUFBQUEsR0FBRyxDQUFDRSxJQUFKLENBQVNELFFBQVEsQ0FBQ0UsUUFBbEIsRUFBNEJGLFFBQVEsQ0FBQ0csUUFBckM7QUFDSCxDQUZEOztBQUlBLE1BQU1DLFVB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O0FBRUQsUUFBTUssSUFBTixDQUFXQyxHQUFYLEVBQWdCQyxLQUFoQixFQUF1QjtBQUNuQixRQUFJaEMsR0FBRyxHQUFHLEtBQUtVLEtBQUwsQ0FBV3VCLEdBQVgsQ0FBZUYsR0FBZixDQUFWOztBQUVBLFFBQUlDLEtBQUosRUFBVztBQUNQaEMsTUFBQUEsR0FBRyxDQUFDZ0MsS0FBSixDQUFVQSxLQUFWO0FBQ0g7O0FBRUQsV0FBTyxLQUFLVixhQUFMLENBQW1CdEIsR0FBbkIsQ0FBUDtBQUNIOztBQUVELFFBQU1rQyxLQUFOLENBQVlILEdBQVosRUFBaUJDLEtBQWpCLEVBQXdCSixJQUF4QixFQUE4QjtBQUMxQixRQUFJNUIsR0FBRyxHQUFHLEtBQUtVLEtBQUwsQ0FBV3lCLElBQVgsQ0FBZ0JKLEdBQWhCLENBQVY7O0FBQ0EsUUFBSUMsS0FBSixFQUFXO0FBQ1BoQyxNQUFBQSxHQUFHLENBQUNnQyxLQUFKLENBQVVBLEtBQVY7QUFDSDs7QUFFRCxRQUFJSixJQUFKLEVBQVU7QUFDTjVCLE1BQUFBLEdBQUcsQ0FBQ29DLElBQUosQ0FBU1IsSUFBVDtBQUNIOztBQUVELFdBQU8sS0FBS04sYUFBTCxDQUFtQnRCLEdBQW5CLENBQVA7QUFDSDs7QUExRmU7O0FBNkZwQnFDLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQjtBQU1iQyxFQUFBQSxJQUFJLEVBQUUxQyxPQUFPLENBQUMyQyxNQU5EO0FBb0JiQyxFQUFBQSxLQUFLLEVBQUUsZ0JBQWdCQyxHQUFoQixFQUFxQmpDLFFBQXJCLEVBQStCO0FBQ2xDLFFBQUlrQyxNQUFNLEdBQUcsSUFBSXBDLGFBQUosQ0FBa0JFLFFBQWxCLENBQWI7QUFDQWlDLElBQUFBLEdBQUcsQ0FBQ0UsZUFBSixDQUFvQixlQUFwQixFQUFxQ0QsTUFBckM7QUFDSDtBQXZCWSxDQUFqQiIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IHsgXyB9ID0gcmVxdWlyZSgncmstdXRpbHMnKTtcbmNvbnN0IEZlYXR1cmUgPSByZXF1aXJlKCcuLi9lbnVtL0ZlYXR1cmUnKTtcbmNvbnN0IHsgdHJ5UmVxdWlyZSB9ID0gcmVxdWlyZSgnLi4vdXRpbHMvSGVscGVycycpO1xuXG5jb25zdCBiYXNpY0F1dGggPSAocmVxLCBhdXRoSW5mbykgPT4ge1xuICAgIHJlcS5hdXRoKGF1dGhJbmZvLnVzZXJuYW1lLCBhdXRoSW5mby5wYXNzd29yZCk7XG59XG5cbmNvbnN0IGJlYXJlckF1dGggPSAocmVxLCBhdXRoSW5mbykgPT4ge1xuICAgIHJlcS5zZXQoJ0F1dGhvcml6YXRpb24nLCBgQmVhcmVyICR7YXV0aEluZm99YCk7XG59XG5cbmNsYXNzIFNpbXBsZUNyYXdsZXIge1xuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzKSB7XG4gICAgICAgIHRoaXMuYWdlbnQgPSB0cnlSZXF1aXJlKCdzdXBlcmFnZW50Jyk7XG5cbiAgICAgICAgaWYgKHNldHRpbmdzLnNhdmVDb29raWVzKSB7XG4gICAgICAgICAgICB0aGlzLmFnZW50ID0gdGhpcy5hZ2VudC5hZ2VudCgpOyAvLyBjcmVhdGUgYSBzZXBhcmF0ZSBjb29raWUgamFyXG4gICAgICAgIH1cblxuICAgICAgICAvL3RpbWVvdXRcbiAgICAgICAgbGV0IHRpbWVvdXQgPSB7XG4gICAgICAgICAgICByZXNwb25zZTogNTAwMCwgLy8gV2FpdCA1IHNlY29uZHMgZm9yIHRoZSBzZXJ2ZXIgdG8gc3RhcnQgc2VuZGluZyxcbiAgICAgICAgICAgIGRlYWRsaW5lOiA2MDAwMCAvLyBidXQgYWxsb3cgMSBtaW51dGUgZm9yIHRoZSBmaWxlIHRvIGZpbmlzaCBsb2FkaW5nLlxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChzZXR0aW5ncy5yZXNwb25zZVRpbWVvdXQpIHtcbiAgICAgICAgICAgIHRpbWVvdXQucmVzcG9uc2UgPSBzZXR0aW5ncy5yZXNwb25zZVRpbWVvdXQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc2V0dGluZ3MuZGVhZGxpbmVUaW1lb3V0KSB7XG4gICAgICAgICAgICB0aW1lb3V0LmRlYWRsaW5lID0gc2V0dGluZ3MuZGVhZGxpbmVUaW1lb3V0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHNldHRpbmdzLnBhcnNlcikge1xuICAgICAgICAgICAgaWYgKHNldHRpbmdzLnBhcnNlciA9PT0gJ2NoZWVyaW8nKSB7XG4gICAgICAgICAgICAgICAgbGV0IHBhcnNlciA9IHRyeVJlcXVpcmUoJ2NoZWVyaW8nKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9hZnRlclJlY2VpdmUgPSAodGV4dCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VyLmxvYWQodGV4dCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gXG4gICAgICAgIH0gXG5cbiAgICAgICAgdGhpcy5fYmVmb3JlU2VuZCA9IChyZXEpID0+IHtcbiAgICAgICAgICAgIC8vdGltZW91dFxuICAgICAgICAgICAgcmVxLnRpbWVvdXQodGltZW91dCk7XG5cbiAgICAgICAgICAgIC8vYXV0aFxuICAgICAgICAgICAgaWYgKHNldHRpbmdzLmJhc2ljQXV0aCkge1xuICAgICAgICAgICAgICAgIGJhc2ljQXV0aChyZXEsIHNldHRpbmdzLmJhc2ljQXV0aCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNldHRpbmdzLmJlYXJlckF1dGgpIHtcbiAgICAgICAgICAgICAgICBiZWFyZXJBdXRoKHJlcSwgc2V0dGluZ3MuYmVhcmVyQXV0aCk7XG4gICAgICAgICAgICB9ICAgICAgXG4gICAgICAgIH07ICAgICAgICAgXG4gICAgfVxuXG4gICAgYXN5bmMgX3NlbmRSZXF1ZXN0XyhyZXEpIHtcbiAgICAgICAgdGhpcy5fYmVmb3JlU2VuZChyZXEpO1xuXG4gICAgICAgIHJlcS5idWZmZXIodHJ1ZSk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxldCByZXMgPSBhd2FpdCByZXE7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fYWZ0ZXJSZWNlaXZlID8gdGhpcy5fYWZ0ZXJSZWNlaXZlKHJlcy50ZXh0KSA6IHJlcy50ZXh0O1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgaWYgKHRoaXMub25FcnJvckhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLm9uRXJyb3JIYW5kbGVyKGVycm9yKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGVycm9yLnJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgbGV0IHsgc3RhdHVzLCBib2R5LCB0ZXh0IH0gPSBlcnJvci5yZXNwb25zZTtcblxuICAgICAgICAgICAgICAgIGxldCBtZXNzYWdlID0gKGJvZHkgJiYgYm9keS5lcnJvcikgfHwgKGVycm9yLnJlc3BvbnNlLmVycm9yICYmIGVycm9yLnJlc3BvbnNlLmVycm9yLm1lc3NhZ2UpIHx8IHRleHQ7XG4gICAgICAgICAgICAgICAgZXJyb3IubWVzc2FnZSA9IG1lc3NhZ2U7ICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGVycm9yLnN0YXR1cyA9IHN0YXR1cztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBnZXRfKHVybCwgcXVlcnkpIHtcbiAgICAgICAgbGV0IHJlcSA9IHRoaXMuYWdlbnQuZ2V0KHVybCk7XG5cbiAgICAgICAgaWYgKHF1ZXJ5KSB7XG4gICAgICAgICAgICByZXEucXVlcnkocXVlcnkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuX3NlbmRSZXF1ZXN0XyhyZXEpO1xuICAgIH1cblxuICAgIGFzeW5jIHBvc3RfKHVybCwgcXVlcnksIGJvZHkpIHtcbiAgICAgICAgbGV0IHJlcSA9IHRoaXMuYWdlbnQucG9zdCh1cmwpO1xuICAgICAgICBpZiAocXVlcnkpIHtcbiAgICAgICAgICAgIHJlcS5xdWVyeShxdWVyeSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYm9keSkge1xuICAgICAgICAgICAgcmVxLnNlbmQoYm9keSk7ICAgICAgICAgICAgXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5fc2VuZFJlcXVlc3RfKHJlcSk7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIC8qKlxuICAgICAqIFRoaXMgZmVhdHVyZSBpcyBsb2FkZWQgYXQgcGx1Z2luIHN0YWdlXG4gICAgICogQG1lbWJlciB7c3RyaW5nfVxuICAgICAqL1xuICAgIHR5cGU6IEZlYXR1cmUuUExVR0lOLFxuXG4gICAgLyoqXG4gICAgICogTG9hZCB0aGUgZmVhdHVyZVxuICAgICAqIEBwYXJhbSB7QXBwfSBhcHAgLSBUaGUgY2xpIGFwcCBtb2R1bGUgb2JqZWN0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gU2V0dGluZ3Mgb2Ygc2ltcGxlIGNyYXdsZXJcbiAgICAgKiBAcHJvcGVydHkge2Jvb2xlYW59IFtzZXR0aW5ncy5zYXZlQ29va2llc10gLSBGbGFnIG9mIHNhdmUgY29va2llcyBvciBub3RcbiAgICAgKiBAcHJvcGVydHkge29iamVjdH0gW3NldHRpbmdzLmJhc2ljQXV0aF0gLSBCYXNpYyBhdXRoZW50aWNhdGlvblxuICAgICAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBbc2V0dGluZ3MuYmVhcmVyQXV0aF0gLSBCZWFyZXIgYXV0aGVudGljYXRpb25cbiAgICAgKiBAcHJvcGVydHkge251bWJlcn0gW3NldHRpbmdzLnJlc3BvbnNlVGltZW91dF0gLSBTZXRzIG1heGltdW0gdGltZSAobXMpIHRvIHdhaXQgZm9yIHRoZSBmaXJzdCBieXRlIHRvIGFycml2ZSBmcm9tIHRoZSBzZXJ2ZXIsIGJ1dCBpdCBkb2VzIG5vdCBsaW1pdCBob3cgbG9uZyB0aGUgZW50aXJlIGRvd25sb2FkIGNhbiB0YWtlLlxuICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBbc2V0dGluZ3MuZGVhZGxpbmVUaW1lb3V0XSAtIFNldHMgYSBkZWFkbGluZSAobXMpIGZvciB0aGUgZW50aXJlIHJlcXVlc3QgKGluY2x1ZGluZyBhbGwgdXBsb2FkcywgcmVkaXJlY3RzLCBzZXJ2ZXIgcHJvY2Vzc2luZyB0aW1lKSB0byBjb21wbGV0ZS5cbiAgICAgKiBcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZS48Kj59XG4gICAgICovXG4gICAgbG9hZF86IGFzeW5jIGZ1bmN0aW9uIChhcHAsIHNldHRpbmdzKSB7XG4gICAgICAgIGxldCBjbGllbnQgPSBuZXcgU2ltcGxlQ3Jhd2xlcihzZXR0aW5ncyk7XG4gICAgICAgIGFwcC5yZWdpc3RlclNlcnZpY2UoJ3NpbXBsZUNyYXdsZXInLCBjbGllbnQpOyAgICBcbiAgICB9XG59OyJdfQ==