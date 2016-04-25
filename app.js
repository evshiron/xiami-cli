
'use strict';

const commander = require('commander');

const request = require('request');

const debug = require('debug')('app');

const Flow = require('node-flow');

const Util = require('./lib/util');

var jsonpCount = 1000;

commander.version(require('./package.json').version);

commander.command('decode <LOCATION>')
    .action((location, command) => {

        console.log(Util.DecodeLocation(location));

    });

commander.command('parse <SONG_ID>')
    .action((songId, command) => {

        Flow(function*(cb, u) {

            const url = `http://www.xiami.com/song/playlist/id/${ songId }/object_name/default/object_id/0/cat/json?_ksTS=${ Date.now() }_${ jsonpCount++ }&callback=jsonp${ jsonpCount++ }`;

            debug('url:', url);

            var [err, res, body] = yield request(url, {}, cb);

            const json = JSON.parse(body.replace(/^\s+jsonp\d+\(/, '').replace(/\)$/, ''));

            debug('json:', json);

            for(let track of json.data.trackList) {

                track.location = Util.DecodeLocation(track.location);

                console.dir(track);

            }

        });

    });

if(process.argv.length <= 3) {

    debug(process.argv);
    commander.help();

}

commander.parse(process.argv);
