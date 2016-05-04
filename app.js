
'use strict';

const DIR_CACHES = './caches/';

const debug = require('debug')('app');

const commander = require('commander');

const mkdirp = require('mkdirp');
mkdirp.sync(DIR_CACHES);

const { Decode, Parse, Login, Sync, ListRecommends, ListSongs, Cache } = require('./lib/actions');

commander.version(require('./package.json').version);

commander.command('*')
    .action((command) => commander.help());

commander.command('decode <LOCATION>')
    .action(Decode);

commander.command('parse <SONG_ID...>')
    .option('-d, --dead')
    .action(Parse);

commander.command('login <USERNAME> <PASSWORD>')
    .action(Login);

commander.command('sync <USERNAME>')
    .action(Sync);

commander.command('list-recommends <USERNAME>')
    .option('-a, --album')
    .option('-m, --meta')
    .action(ListRecommends);

commander.command('list-songs')
    .option('-C, --count-only')
    .option('-a, --album')
    .option('-m, --meta')
    .option('--dead-only')
    .action(ListSongs);

commander.command('cache [SONG_ID...]')
    .option('-A, --all')
    .action(Cache);

if(process.argv.length <= 2) {

    debug(process.argv);
    commander.help();

}

commander.parse(process.argv);
