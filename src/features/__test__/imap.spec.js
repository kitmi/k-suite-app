'use strict';

const path = require('path');
const Util = require('rk-utils');
const App = require('../../../lib/App');

const WORKING_DIR = path.resolve(__dirname, '../../../test/temp');

describe.only('feature:imap', function () {
    let cliApp;

    before(async function () {
        Util.fs.emptyDirSync(WORKING_DIR);

        cliApp = new App('test server', { 
            workingPath: WORKING_DIR
        });

        cliApp.once('configLoaded', () => {
            cliApp.config = {
                "imap": {
                    "test": {
                        "host": "imap.gmail.com",
                        "port": 993,
                        "secure": true, 
                        "user": "levo.test.2019.7@gmail.com",
                        "password": "Levo123!",
                        "tls": true,
                        "connTimeout": 60000,
                        "authTimeout": 60000
                    }
                }
            };
        });

        return cliApp.start_();
    });

    after(async function () {        
        await cliApp.stop_();    
        Util.fs.removeSync(WORKING_DIR);
    });

    it('get service', async function () {            
        let imapClient = cliApp.getService('imap.test');
        should.exist(imapClient);

        await imapClient.waitForReady_();

        imapClient.ready.should.be.ok();

        let inbox = await imapClient.openBox_('INBOX', true);

        inbox.name.should.be.equal('INBOX');
    });
});