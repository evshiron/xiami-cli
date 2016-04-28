
'use strict';

const request = require('request');

const cheerio = require('cheerio');

const Flow = require('node-flow');

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

            const songs = [];

            for(let i = 0; i < chunks.length; i++) {

                let chunk = chunks[i];

                let url = `http://www.xiami.com/song/playlist/id/${ chunk.join('%2C') }/object_name/default/object_id/0/cat/json`;

                let [err, res, body] = yield request(url, {}, cb);
                if(err) return callback(err);

                let json = JSON.parse(body);

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

                let [err, res, body] = yield request(url, {}, cb);
                if(err) return callback(err);

                let song = {

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

                songs.push(song);

            }

            return callback(null, songs);

        });

    }

}

module.exports = {

    DecodeLocation: DecodeLocation,
    ParseSongByIds: ParseSongByIds,

};
