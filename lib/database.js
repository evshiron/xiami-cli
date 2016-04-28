
'use strict';

const DIR_DATA = './data/';

const Datastore = require('nedb');

const mkdirp = require('mkdirp');
mkdirp.sync(DIR_DATA);

class Database {

    constructor() {

        this.Users = new Datastore({
            filename: './data/users.nedb',
            autoload: true,
        });

        this.Songs = new Datastore({
            filename: './data/songs.nedb',
            autoload: true,
        });

    }

}

const instance = new Database();

module.exports = instance;
