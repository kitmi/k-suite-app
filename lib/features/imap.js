"use strict";

require("source-map-support/register");

const Feature = require('../enum/Feature');

const {
  tryRequire
} = require('../utils/Helpers');

const Imap = tryRequire('imap');

const {
  _,
  waitUntil_,
  Promise
} = require('rk-utils');

class ImapClient {
  constructor(app, name, config) {
    this.app = app;
    this.name = name;
    this.config = config;
    this.closing = false;
    this.connecting = false;
    let {
      autoReconnect,
      ...imapConfig
    } = config;
    this.imap = new Imap(imapConfig);
    this.imap.on('error', error => {
      this.app.logError(error);
    });
    this.imap.on('alert', message => {
      this.app.log('warning', `The imap server [${this.name}] issues an alert. Message: ${message}`);
    });
    this.imap.on('ready', () => {
      this.ready = true;
      this.connecting = false;
      this.app.log('info', `The imap server [${this.name}] is ready.`);
    });
    this.imap.on('close', () => {
      this.ready = false;
      this.app.log('info', `The connection to imap server [${this.name}] is closed.`);
    });
    this.imap.on('end', () => {
      this.ready = false;
      this.app.log('info', `The imap server [${this.name}] is ended.`);

      if (autoReconnect && !this.closing && !this.connecting) {
        this._connect();
      }
    });
    let options = {
      context: this.imap
    };
    ['openBox', 'closeBox', 'addBox', 'delBox', 'renameBox', 'subscribeBox', 'unsubscribeBox', 'status', 'getBoxes', 'getSubscribedBoxes', 'expunge', 'append', 'search', 'copy', 'move', 'addFlags', 'delFlags', 'setFlags', 'addKeywords', 'delKeywords', 'setKeywords', 'setLabels', 'addLabels', 'delLabels'].forEach(methodName => {
      this[methodName + '_'] = Promise.promisify(this.imap[methodName], options);
    });

    this._connect();
  }

  _connect() {
    this.connecting = true;
    this.imap.connect();
  }

  async waitForReady_(interval = 500, maxRound = 30) {
    return waitUntil_(() => this.ready, interval, maxRound);
  }

  async connect_() {
    if (!this.ready) {
      if (!this.connecting) {
        this._connect();
      }

      return this.waitForReady_();
    }

    return this.ready;
  }

  async close_() {
    if (this.ready) {
      this.closing = true;
      this.imap.end();
      let ended = await waitUntil_(() => !this.ready, 100, 300);

      if (!ended) {
        this.imap.destroy();
      }
    }
  }

  serverSupports(caps) {
    return this.imap.serverSupports(caps);
  }

  async fetch_(source, fetchOptions) {
    let imapFetch = this.imap.fetch(source, fetchOptions);
    let messages = [];
    imapFetch.on('message', (msg, seqno) => {
      let attributes;
      let body = [];
      msg.on('body', (stream, info) => {
        body.push({
          section: info.which,
          size: info.size,
          stream
        });
      });
      msg.once('attributes', attrs => {
        attributes = attrs;
      });
      msg.once('end', () => {
        messages.push({
          seqno,
          attributes,
          body
        });
      });
    });
    return await new Promise((resolve, reject) => {
      imapFetch.on('end', () => {
        resolve(messages);
      });
      imapFetch.on('error', error => {
        reject(error);
      });
    });
  }

}

module.exports = {
  type: Feature.SERVICE,
  load_: async function (app, settings) {
    _.forOwn(settings, (cfg, name) => {
      let client = new ImapClient(app, name, cfg);
      app.registerService(`imap.${name}`, client);
      app.on('stopping', elegantStoppers => {
        elegantStoppers.push(client.close_());
      });
    });
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9mZWF0dXJlcy9pbWFwLmpzIl0sIm5hbWVzIjpbIkZlYXR1cmUiLCJyZXF1aXJlIiwidHJ5UmVxdWlyZSIsIkltYXAiLCJfIiwid2FpdFVudGlsXyIsIlByb21pc2UiLCJJbWFwQ2xpZW50IiwiY29uc3RydWN0b3IiLCJhcHAiLCJuYW1lIiwiY29uZmlnIiwiY2xvc2luZyIsImNvbm5lY3RpbmciLCJhdXRvUmVjb25uZWN0IiwiaW1hcENvbmZpZyIsImltYXAiLCJvbiIsImVycm9yIiwibG9nRXJyb3IiLCJtZXNzYWdlIiwibG9nIiwicmVhZHkiLCJfY29ubmVjdCIsIm9wdGlvbnMiLCJjb250ZXh0IiwiZm9yRWFjaCIsIm1ldGhvZE5hbWUiLCJwcm9taXNpZnkiLCJjb25uZWN0Iiwid2FpdEZvclJlYWR5XyIsImludGVydmFsIiwibWF4Um91bmQiLCJjb25uZWN0XyIsImNsb3NlXyIsImVuZCIsImVuZGVkIiwiZGVzdHJveSIsInNlcnZlclN1cHBvcnRzIiwiY2FwcyIsImZldGNoXyIsInNvdXJjZSIsImZldGNoT3B0aW9ucyIsImltYXBGZXRjaCIsImZldGNoIiwibWVzc2FnZXMiLCJtc2ciLCJzZXFubyIsImF0dHJpYnV0ZXMiLCJib2R5Iiwic3RyZWFtIiwiaW5mbyIsInB1c2giLCJzZWN0aW9uIiwid2hpY2giLCJzaXplIiwib25jZSIsImF0dHJzIiwicmVzb2x2ZSIsInJlamVjdCIsIm1vZHVsZSIsImV4cG9ydHMiLCJ0eXBlIiwiU0VSVklDRSIsImxvYWRfIiwic2V0dGluZ3MiLCJmb3JPd24iLCJjZmciLCJjbGllbnQiLCJyZWdpc3RlclNlcnZpY2UiLCJlbGVnYW50U3RvcHBlcnMiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSxNQUFNQSxPQUFPLEdBQUdDLE9BQU8sQ0FBQyxpQkFBRCxDQUF2Qjs7QUFDQSxNQUFNO0FBQUVDLEVBQUFBO0FBQUYsSUFBaUJELE9BQU8sQ0FBQyxrQkFBRCxDQUE5Qjs7QUFDQSxNQUFNRSxJQUFJLEdB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QUksRUFBRTlELE9BQU8sQ0FBQytELE9BTkQ7QUFjYkMsRUFBQUEsS0FBSyxFQUFFLGdCQUFnQnZELEdBQWhCLEVBQXFCd0QsUUFBckIsRUFBK0I7QUFDbEM3RCxJQUFBQSxDQUFDLENBQUM4RCxNQUFGLENBQVNELFFBQVQsRUFBbUIsQ0FBQ0UsR0FBRCxFQUFNekQsSUFBTixLQUFlO0FBQzlCLFVBQUkwRCxNQUFNLEdBQUcsSUFBSTdELFVBQUosQ0FBZUUsR0FBZixFQUFvQkMsSUFBcEIsRUFBMEJ5RCxHQUExQixDQUFiO0FBQ0ExRCxNQUFBQSxHQUFHLENBQUM0RCxlQUFKLENBQXFCLFFBQU8zRCxJQUFLLEVBQWpDLEVBQW9DMEQsTUFBcEM7QUFFQTNELE1BQUFBLEdBQUcsQ0FBQ1EsRUFBSixDQUFPLFVBQVAsRUFBb0JxRCxlQUFELElBQXFCO0FBQ3BDQSxRQUFBQSxlQUFlLENBQUNsQixJQUFoQixDQUFxQmdCLE1BQU0sQ0FBQ2xDLE1BQVAsRUFBckI7QUFDSCxPQUZEO0FBR0gsS0FQRDtBQVFIO0FBdkJZLENBQWpCIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgRmVhdHVyZSA9IHJlcXVpcmUoJy4uL2VudW0vRmVhdHVyZScpO1xuY29uc3QgeyB0cnlSZXF1aXJlIH0gPSByZXF1aXJlKCcuLi91dGlscy9IZWxwZXJzJyk7XG5jb25zdCBJbWFwID0gdHJ5UmVxdWlyZSgnaW1hcCcpO1xuY29uc3QgeyBfLCB3YWl0VW50aWxfLCBQcm9taXNlIH0gPSByZXF1aXJlKCdyay11dGlscycpO1xuXG5jbGFzcyBJbWFwQ2xpZW50IHtcbiAgICBjb25zdHJ1Y3RvcihhcHAsIG5hbWUsIGNvbmZpZykgeyAgICAgICAgXG4gICAgICAgIHRoaXMuYXBwID0gYXBwO1xuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lOyAgICAgICAgXG4gICAgICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuXG4gICAgICAgIHRoaXMuY2xvc2luZyA9IGZhbHNlO1xuICAgICAgICB0aGlzLmNvbm5lY3RpbmcgPSBmYWxzZTtcblxuICAgICAgICBsZXQgeyBhdXRvUmVjb25uZWN0LCAuLi5pbWFwQ29uZmlnIH0gPSBjb25maWc7ICAgICAgICAgXG5cbiAgICAgICAgdGhpcy5pbWFwID0gbmV3IEltYXAoaW1hcENvbmZpZyk7XG5cbiAgICAgICAgdGhpcy5pbWFwLm9uKCdlcnJvcicsIGVycm9yID0+IHsgXG4gICAgICAgICAgICB0aGlzLmFwcC5sb2dFcnJvcihlcnJvcik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuaW1hcC5vbignYWxlcnQnLCBtZXNzYWdlID0+IHtcbiAgICAgICAgICAgIHRoaXMuYXBwLmxvZygnd2FybmluZycsIGBUaGUgaW1hcCBzZXJ2ZXIgWyR7dGhpcy5uYW1lfV0gaXNzdWVzIGFuIGFsZXJ0LiBNZXNzYWdlOiAke21lc3NhZ2V9YCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuaW1hcC5vbigncmVhZHknLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnJlYWR5ID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5hcHAubG9nKCdpbmZvJywgYFRoZSBpbWFwIHNlcnZlciBbJHt0aGlzLm5hbWV9XSBpcyByZWFkeS5gKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5pbWFwLm9uKCdjbG9zZScsICgpID0+IHsgICAgXG4gICAgICAgICAgICB0aGlzLnJlYWR5ID0gZmFsc2U7IFxuICAgICAgICAgICAgdGhpcy5hcHAubG9nKCdpbmZvJywgYFRoZSBjb25uZWN0aW9uIHRvIGltYXAgc2VydmVyIFske3RoaXMubmFtZX1dIGlzIGNsb3NlZC5gKTsgICAgICAgICAgIFxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmltYXAub24oJ2VuZCcsICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMucmVhZHkgPSBmYWxzZTsgICAgXG4gICAgICAgICAgICB0aGlzLmFwcC5sb2coJ2luZm8nLCBgVGhlIGltYXAgc2VydmVyIFske3RoaXMubmFtZX1dIGlzIGVuZGVkLmApO1xuXG4gICAgICAgICAgICBpZiAoYXV0b1JlY29ubmVjdCAmJiAhdGhpcy5jbG9zaW5nICYmICF0aGlzLmNvbm5lY3RpbmcpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9jb25uZWN0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vcHJvbWlzaWZ5IGltYXAgZnVuY3Rpb25zXG4gICAgICAgIGxldCBvcHRpb25zID0geyBjb250ZXh0OiB0aGlzLmltYXAgfTtcblxuICAgICAgICBbXG4gICAgICAgICAgICAnb3BlbkJveCcsICdjbG9zZUJveCcsICdhZGRCb3gnLCAnZGVsQm94JywgJ3JlbmFtZUJveCcsICdzdWJzY3JpYmVCb3gnLCAndW5zdWJzY3JpYmVCb3gnLFxuICAgICAgICAgICAgJ3N0YXR1cycsICdnZXRCb3hlcycsICdnZXRTdWJzY3JpYmVkQm94ZXMnLCAnZXhwdW5nZScsICdhcHBlbmQnLFxuICAgICAgICAgICAgLy9BbGwgZnVuY3Rpb25zIGJlbG93IGhhdmUgc2VxdWVuY2UgbnVtYmVyLWJhc2VkIGNvdW50ZXJwYXJ0cyB0aGF0IFxuICAgICAgICAgICAgLy9jYW4gYmUgYWNjZXNzZWQgYnkgdXNpbmcgdGhlICdzZXEnIG5hbWVzcGFjZSBvZiB0aGUgaW1hcCBjb25uZWN0aW9uJ3MgXG4gICAgICAgICAgICAvL2luc3RhbmNlIChlLmcuIGNvbm4uc2VxLnNlYXJjaCgpIHJldHVybnMgc2VxdWVuY2UgbnVtYmVyKHMpIGluc3RlYWQgb2YgVUlEcywgXG4gICAgICAgICAgICAvL2Nvbm4uc2VxLmZldGNoKCkgZmV0Y2hlcyBieSBzZXF1ZW5jZSBudW1iZXIocykgaW5zdGVhZCBvZiBVSURzLCBldGMpOlxuICAgICAgICAgICAgJ3NlYXJjaCcsICdjb3B5JywgJ21vdmUnLCAnYWRkRmxhZ3MnLCAnZGVsRmxhZ3MnLCAnc2V0RmxhZ3MnLCAnYWRkS2V5d29yZHMnLCAnZGVsS2V5d29yZHMnLCAnc2V0S2V5d29yZHMnLFxuXG4gICAgICAgICAgICAvL2dtYWlsIGV4dGVudGlvblxuICAgICAgICAgICAgJ3NldExhYmVscycsICdhZGRMYWJlbHMnLCAnZGVsTGFiZWxzJ1xuICAgICAgICBdLmZvckVhY2gobWV0aG9kTmFtZSA9PiB7XG4gICAgICAgICAgICB0aGlzW21ldGhvZE5hbWUgKyAnXyddID0gUHJvbWlzZS5wcm9taXNpZnkodGhpcy5pbWFwW21ldGhvZE5hbWVdLCBvcHRpb25zKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fY29ubmVjdCgpO1xuICAgIH1cblxuICAgIF9jb25uZWN0KCkge1xuICAgICAgICB0aGlzLmNvbm5lY3RpbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLmltYXAuY29ubmVjdCgpO1xuICAgIH1cblxuICAgIGFzeW5jIHdhaXRGb3JSZWFkeV8oaW50ZXJ2YWwgPSA1MDAsIG1heFJvdW5kID0gMzApIHtcbiAgICAgICAgcmV0dXJuIHdhaXRVbnRpbF8oKCkgPT4gdGhpcy5yZWFkeSwgaW50ZXJ2YWwsIG1heFJvdW5kKTtcbiAgICB9XG5cbiAgICBhc3luYyBjb25uZWN0XygpIHtcbiAgICAgICAgaWYgKCF0aGlzLnJlYWR5KSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuY29ubmVjdGluZykge1xuICAgICAgICAgICAgICAgIHRoaXMuX2Nvbm5lY3QoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRoaXMud2FpdEZvclJlYWR5XygpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMucmVhZHk7XG4gICAgfVxuXG4gICAgYXN5bmMgY2xvc2VfKCkgeyAgICAgIFxuICAgICAgICBpZiAodGhpcy5yZWFkeSkgeyAgXG4gICAgICAgICAgICB0aGlzLmNsb3NpbmcgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5pbWFwLmVuZCgpO1xuXG4gICAgICAgICAgICBsZXQgZW5kZWQgPSBhd2FpdCB3YWl0VW50aWxfKCgpID0+ICF0aGlzLnJlYWR5LCAxMDAsIDMwMCk7XG5cbiAgICAgICAgICAgIGlmICghZW5kZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmltYXAuZGVzdHJveSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSAgXG4gICAgXG4gICAgc2VydmVyU3VwcG9ydHMoY2Fwcykge1xuICAgICAgICByZXR1cm4gdGhpcy5pbWFwLnNlcnZlclN1cHBvcnRzKGNhcHMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IE1hcCBvZiBzZXFubyB0byBtZXNzYWdlXG4gICAgICovXG4gICAgYXN5bmMgZmV0Y2hfKHNvdXJjZSwgZmV0Y2hPcHRpb25zKSB7XG4gICAgICAgIGxldCBpbWFwRmV0Y2ggPSB0aGlzLmltYXAuZmV0Y2goc291cmNlLCBmZXRjaE9wdGlvbnMpO1xuXG4gICAgICAgIGxldCBtZXNzYWdlcyA9IFtdO1xuXG4gICAgICAgIGltYXBGZXRjaC5vbignbWVzc2FnZScsIChtc2csIHNlcW5vKSA9PiB7ICAgICAgICAgICAgXG4gICAgICAgICAgICBsZXQgYXR0cmlidXRlcztcbiAgICAgICAgICAgIGxldCBib2R5ID0gW107XG5cbiAgICAgICAgICAgIG1zZy5vbignYm9keScsIChzdHJlYW0sIGluZm8pID0+IHtcbiAgICAgICAgICAgICAgICBib2R5LnB1c2goeyBzZWN0aW9uOiBpbmZvLndoaWNoLCBzaXplOiBpbmZvLnNpemUsIHN0cmVhbSB9KTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBtc2cub25jZSgnYXR0cmlidXRlcycsIChhdHRycykgPT4ge1xuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXMgPSBhdHRycztcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBtc2cub25jZSgnZW5kJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VzLnB1c2goeyBzZXFubywgYXR0cmlidXRlcywgYm9keSB9KTtcbiAgICAgICAgICAgIH0pOyAgICAgXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBpbWFwRmV0Y2gub24oJ2VuZCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKG1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpbWFwRmV0Y2gub24oJ2Vycm9yJywgKGVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTsgICAgICAgICAgICAgICBcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgLyoqXG4gICAgICogVGhpcyBmZWF0dXJlIGlzIGxvYWRlZCBhdCBpbml0IHN0YWdlXG4gICAgICogQG1lbWJlciB7c3RyaW5nfVxuICAgICAqL1xuICAgIHR5cGU6IEZlYXR1cmUuU0VSVklDRSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgdGhlIGZlYXR1cmVcbiAgICAgKiBAcGFyYW0ge0FwcH0gYXBwIC0gVGhlIGNsaSBhcHAgbW9kdWxlIG9iamVjdFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIFNldHRpbmdzIG9mIHJlc3QgY2xpZW50cyAgICBcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZS48Kj59XG4gICAgICovXG4gICAgbG9hZF86IGFzeW5jIGZ1bmN0aW9uIChhcHAsIHNldHRpbmdzKSB7XG4gICAgICAgIF8uZm9yT3duKHNldHRpbmdzLCAoY2ZnLCBuYW1lKSA9PiB7XG4gICAgICAgICAgICBsZXQgY2xpZW50ID0gbmV3IEltYXBDbGllbnQoYXBwLCBuYW1lLCBjZmcpO1xuICAgICAgICAgICAgYXBwLnJlZ2lzdGVyU2VydmljZShgaW1hcC4ke25hbWV9YCwgY2xpZW50KTtcblxuICAgICAgICAgICAgYXBwLm9uKCdzdG9wcGluZycsIChlbGVnYW50U3RvcHBlcnMpID0+IHtcbiAgICAgICAgICAgICAgICBlbGVnYW50U3RvcHBlcnMucHVzaChjbGllbnQuY2xvc2VfKCkpOyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuIl19