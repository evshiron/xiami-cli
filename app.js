
'use strict';

const DIR_CACHES = './caches/';

const fs = require('fs');
const url = require('url');
const path = require('path');

const debug = require('debug')('app');

const commander = require('commander');

const request = require('request');
request.defaults({
    headers: {
        'user-agent': 'Mozilla/5.0 (xiami-cli)',
    },
});

const cheerio = require('cheerio');

const CookieJar = require('tough-cookie').CookieJar;

const mkdirp = require('mkdirp');
mkdirp.sync(DIR_CACHES);

const Flow = require('node-flow');

const Database = require('./lib/database');

const Util = require('./lib/util');

commander.version(require('./package.json').version);

commander.command('decode <LOCATION>')
    .action((location, command) => {

        console.log(Util.DecodeLocation(location));

    });

commander.command('parse <SONG_ID...>')
    .action((songIds, command) => {

        Flow(function*(cb, u) {

            var [err, data] = yield Util.ParseSongByIds(songIds, cb);

            console.dir(data);

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

commander.command('sync <USERNAME>')
    .action((username, command) => {

        Flow(function*(cb, u) {

            var [err, user] = yield Database.Users.findOne({
                username: username,
            }, cb);

            if(err) {
                console.error(err);
                return;
            }

            if(!user) {
                console.warn('WARN_USER_NOT_EXIST');
                return;
            }

            debug('user:', user);

            const jar = request.jar();
            jar._jar = CookieJar.deserializeSync(user.cookies);

            const libUrl = `http://www.xiami.com/space/lib-song/u/${ user.userId }`;

            debug('libUrl:', libUrl);

            var [err, res, body] = yield request(libUrl, {}, cb);
            if(err) {
                console.error(err);
                return;
            }

            const $ = cheerio.load(body);

            const totalItemCount = parseInt($('span.counts').text());
            const pagedItemCount = $('table.track_list tr').length;
            const pageCount = Math.ceil(totalItemCount / pagedItemCount);

            debug('totalItemCount:', totalItemCount);
            debug('pagedItemCount:', pagedItemCount);
            debug('pageCount:', pageCount);

            const aliveSongIds = [];
            const deadSongIds = [];

            for(let i = 1; i <= pageCount; i++) {

                let pageUrl = `http://www.xiami.com/space/lib-song/u/${ user.userId }/page/${ i }`;

                debug('pageUrl:', pageUrl);

                let [err, res, body] = yield request(pageUrl, {
                    jar: jar,
                }, cb);

                if(err) {
                    console.error(err);
                    return;
                }

                let $ = cheerio.load(body);

                let page = parseInt($('a.p_curpage').text());

                let $songItems = $('table.track_list tr');

                debug('page:', page, ', itemCount:', $songItems.length);

                $songItems.each((index, element) => {

                    const $input = $(element).find('td.chkbox input');

                    ($input.attr('disabled') ? deadSongIds : aliveSongIds).push($input.val());

                });

            }

            debug('aliveSongIds:', aliveSongIds);
            debug('deadSongIds:', deadSongIds);

            function insertSongBase(songId, isAlive, callback) {

                Database.Songs.findOne({

                    songId: songId,

                }, (err, song) => {

                    if(err) return callback(err);

                    if(song) return callback('ERROR_SONG_EXIST');

                    Database.Songs.insert({

                        songId: songId,
                        isAlive: isAlive,

                    }, callback);

                });

            }

            function insertSongDetail(songId, songDetail, callback) {

                Database.Songs.findOne({

                    songId: songId,

                }, (err, song) => {

                    if(err) return callback(err);

                    if(!song) return callback('ERROR_SONG_NOT_EXIST');

                    Database.Songs.update({

                        songId: songId,

                    }, {

                        $set: {

                            title: songDetail.title,
                            album: songDetail.album,
                            artist: songDetail.artist,

                            songId: songDetail.songId,
                            albumId: songDetail.albumId,
                            albumImageUrl: songDetail.albumImageUrl,
                            artistId: songDetail.artistId,

                        },

                    }, callback);

                });

            }

            for(let songId of aliveSongIds) {

                yield insertSongBase(songId, true, cb);

            }

            for(let songId of deadSongIds) {

                yield insertSongBase(songId, false, cb);

            }

            var [err, songs] = yield Util.ParseSongByIds(aliveSongIds, cb);

            for(let song of songs) {

                insertSongDetail(song.songId, song);

            }

        });

    });

commander.command('list-songs')
    .option('-C, --count-only')
    .option('-a, --album')
    .option('-m, --meta')
    .option('--dead-only')
    .action((command) => {

        Flow(function*(cb, u) {

            var [err, songs] = yield Database.Songs.find({
                isAlive: !command.deadOnly,
            }, cb);
            if(err) {
                console.error(err);
                return;
            }

            console.log('Count:', songs.length);
            if(command.countOnly) return;

            for(let i = 0; i < songs.length; i++) {

                let song = songs[i];

                console.log(i, song.title, song.artist);
                if(command.album) console.log('album:', song.album);
                if(command.meta) {

                    console.log('songId:', song.songId);
                    console.log('albumId:', song.albumId);
                    console.log('albumImageUrl:', song.albumImageUrl);
                    console.log('artistId:', song.artistId);

                }

            }

        });

    });

commander.command('cache [SONG_ID...]')
    .option('-A, --all')
    .action((songIds, command) => {

        Flow(function*(cb, u) {

            if(songIds.length == 0 && command.all) {

                let [err, songs] = yield Database.Songs.find({
                    isAlive: !command.deadOnly,
                }, cb);
                if(err) {
                    console.error(err);
                    return;
                }

                console.log('Count:', songs.length);
                songIds = songs.map((song, index, songs) => song.songId);

            }

            var [err, songs] = yield Util.ParseSongByIds(songIds, cb);
            if(err) {
                console.error(err);
                return;
            }

            for(let i = 0; i < songs.length; i++) {

                let song = songs[i];

                debug('song:', song);

                let cache = path.join(DIR_CACHES, path.basename(url.parse(song.resourceUrl).pathname));

                debug('cache:', cache);

                {

                    let [err, res, body] = yield request(song.resourceUrl, {
                        encoding: null,
                    }, cb).pipe(fs.createWriteStream(cache));

                    if(err) {
                        console.error(err);
                        return;
                    }

                }

                {

                    let [err] = yield Database.Songs.findOne({

                        songId: song.songId,

                    }, (err, song) => {

                        if(err) return callback(err);

                        if(!song) return callback('ERROR_SONG_NOT_EXIST');

                        Database.Songs.update({

                            songId: song.songId,

                        }, {

                            $set: {

                                cache: cache,

                            },

                        }, cb);

                    });

                }

            }

        });

    });

if(process.argv.length <= 2) {

    debug(process.argv);
    commander.help();

}

commander.parse(process.argv);
