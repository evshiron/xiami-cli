
'use strict';

const request = require('request');

const cheerio = require('cheerio');

const Flow = require('node-flow');

const Database = require('./database');

function GetUser(username, callback) {

    Database.Users.findOne({
        username: username,
    }, (err, user) => {

        if(err) return callback(err);

        if(!user) return callback('WARN_USER_NOT_EXIST');

        return callback(null, user);

    });

}

function DecodeLocation(location) {

    const debug = require('debug')('Util.DecodeLocation');

    const rows = parseInt(location.charAt(0));
    const box = location.slice(1);
    const columns = Math.ceil(box.length / rows);
    const delta = rows * columns - box.length;

    debug('params:', rows, columns, delta, box);

    const matrix = [];

    var idx = 0;
    for(let i = 0; i < rows; i++) {

        let len = i < rows - delta ? columns : columns - 1;
        matrix.push(box.slice(idx, idx + len));
        idx += len;

    }

    debug('matrix:', matrix);

    var decrypted = '';
    for(let i = 0; i < columns; i++) {

        for(let j = 0; j < rows; j++) {

            const char = matrix[j].charAt(i);
            char ? decrypted += char : null;

        }

    }

    const decoded = decodeURIComponent(decrypted).replace(/\^/g, '0');

    debug('decoded:', decoded);

    return decoded;

}

function ParseSongsByJsonUrl(url, callback) {

    request(url, {}, (err, res, body) => {

        if(err) return callback(err);

        const json = JSON.parse(body);

        const songs = [];

        for(let track of json.data.trackList) {

            songs.push({

                songId: track.song_id,
                title: track.title,
                album: track.album_name,
                albumId: track.album_id,
                albumImageUrl: track.album_pic,
                artist: track.artist,
                artistId: track.artist_id,
                resourceUrl: DecodeLocation(track.location),

            });

        }

        return callback(null, songs);

    });

}

function ParseSongByDetailUrl(url, callback) {

    equest(url, {}, (err, res, body) => {

        if(err) return callback(err);

        const song = {

            songId: songId,
            title: null,
            album: null,
            albumId: null,
            albumImageUrl: null,
            artist: null,
            artistId: null,
            resourceUrl: null,

        };

        let $ = cheerio.load(body);

        song.title = $('div#title h1').text();

        song.albumImageUrl = $('img.cdCDcover185').attr('src').replace('_2.', '.');

        $('table#albums_info tr').each((index, element) => {

            let key = $(element).children('td').eq(0).text();
            let $a = $(element).find('a');

            switch(key) {
            case '所属专辑：':

                song.albumId = $a.attr('href').replace('/album/', '');
                song.album = $a.text();

                break;
            case '演唱者：':

                song.artistId = $a.attr('href').replace('/artist/', '');
                song.artist = $a.text();

                break;
            default:
                break;
            }

        });

    });

}

function ParseSongByIds(songIds, isAlive, callback) {

    const debug = require('debug')('Util.ParseSongByIds');

    if(isAlive) {

        Flow(function*(cb, u) {

            const CHUNK_LENGTH = 25;

            const chunks = [];
            for(let i = 0; i < songIds.length; i += CHUNK_LENGTH) {
                chunks.push(songIds.slice(i, i + CHUNK_LENGTH));
            }

            debug('chunks:', chunks);

            var songs = [];

            for(let i = 0; i < chunks.length; i++) {

                let chunk = chunks[i];

                let url = `http://www.xiami.com/song/playlist/id/${ chunk.join('%2C') }/object_name/default/object_id/0/cat/json`;

                let [err, chunkSongs] = yield ParseSongsByJsonUrl(url, cb);
                if(err) return callback(err);

                songs = [...songs, ...chunkSongs];

            }

            return callback(null, songs);

        });

    }
    else {

        Flow(function*(cb, u) {

            var songs = [];

            for(let i = 0; i < songIds.length; i++) {

                let songId = songIds[i];

                let url = `http://www.xiami.com/song/${ songId }`;

                let [err, song] = yield ParseSongByDetailUrl(url, cb);
                if(err) return callback(err);

                songs.push(song);

            }

            return callback(null, songs);

        });

    }

}

module.exports = {

    GetUser: GetUser,
    DecodeLocation: DecodeLocation,
    ParseSongsByJsonUrl: ParseSongsByJsonUrl,
    ParseSongByDetailUrl: ParseSongByDetailUrl,
    ParseSongByIds: ParseSongByIds,

};
