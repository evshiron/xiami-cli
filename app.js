
'use strict';

const commander = require('commander');

const request = require('request');
request.defaults({
    headers: {
        'user-agent': 'Mozilla/5.0 (xiami-cli)',
    },
});

const debug = require('debug')('app');

const Flow = require('node-flow');

const Database = require('./lib/database');

const Util = require('./lib/util');

var jsonpCount = 1000;

commander.version(require('./package.json').version);

commander.command('decode <LOCATION>')
    .action((location, command) => {

        console.log(Util.DecodeLocation(location));

    });

commander.command('parse <SONG_ID...>')
    .action((songIds, command) => {

        Flow(function*(cb, u) {

            const url = `http://www.xiami.com/song/playlist/id/${ songIds.join('%2C') }/object_name/default/object_id/0/cat/json?_ksTS=${ Date.now() }_${ jsonpCount++ }&callback=jsonp${ jsonpCount++ }`;

            debug('url:', url);

            var [err, res, body] = yield request(url, {}, cb);
            if(err) {
                console.error(err);
                return;
            }

            const json = JSON.parse(body.replace(/^\s+jsonp\d+\(/, '').replace(/\)$/, ''));

            debug('json:', json);

            for(let track of json.data.trackList) {

                track.location = Util.DecodeLocation(track.location);

                console.dir(track);

            }

        });

    });

commander.command('login <USERNAME> <PASSWORD>')
    .action((username, password, command) => {

        Flow(function*(cb, u) {

            const jar = request.jar();

            const homeUrl = 'http://www.xiami.com/';

            var [err, res, body] = yield request(homeUrl, {
                jar: jar,
            }, cb);

            if(err) {
                console.error(err);
                return;
            }

            const loginUrl = `https://login.xiami.com/member/login?callback=login`;

            debug('loginUrl:', loginUrl);

            const loginForm = {
                _xiamitoken: jar.getCookies('http://www.xiami.com/').find((element, index, array) => element.key == '_xiamitoken').value,
                done: 'http://www.xiami.com',
                from: 'web',
                havanaId: '',
                email: username,
                password: password,
                submit: '登 录',
            };

            debug('loginForm:', loginForm);

            var [err, res, body] = yield request.post(loginUrl, {
                jar: jar,
                headers: {
                    'referer': 'https://login.xiami.com/member/login',
                },
                form: loginForm,
            }, cb);

            if(err) {
                console.error(err);
                return;
            }

            const json = JSON.parse(body.replace(/^\s+login\(/, '').replace(/\)$/, ''));

            debug('json:', json);

            Database.Users.insert({
                username: username,
                userId: json.data.user_id,
                nickname: json.data.nick_name,
                cookies: jar._jar.serializeSync(),
            });

            console.log(json.status, json.message);

        });

    });

if(process.argv.length <= 3) {

    debug(process.argv);
    commander.help();

}

commander.parse(process.argv);
