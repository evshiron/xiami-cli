
const commander = require('commander');

const debug = require('debug')('app');

const Util = require('./lib/util');

commander.version(require('./package.json').version);

commander.command('decode <LOCATION>')
    .action((location, command) => {

        console.log(Util.DecodeLocation(location));

    });

if(process.argv.length <= 3) {

    debug(process.argv);
    commander.help();

}

commander.parse(process.argv);
