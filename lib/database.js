
'use strict';

const Datastore = require('nedb');

const mkdirp = require('mkdirp');
mkdirp.sync('./data/');

class Database {

    constructor() {

        this.Users = new Datastore({
            filename: './data/users.nedb',
            autoload: true,
        });

    }

}

const instance = new Database();

module.exports = instance;
