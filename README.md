# xiami-cli

A command line xiami utility.

## Installation

```shell
$ npm install evshiron/xiami-cli -g

$ xiami-cli --help
```

## Usage

The current working directory is `process.cwd()`.

The command line is powered by `tj/commander.js`, and database is powered by `louischatriot/nedb`.

```shell
# Print help.
$ xiami-cli
$ xiami-cli -h
$ xiami-cli --help

# Print help for a command.
$ xiami-cli <COMMAND> -h
$ xiami-cli <COMMAND> --help

# Decode xiami caesar box string.
$ xiami-cli decode <LOCATION>

# Parse song information by songIds.
$ xiami-cli parse <SONG_ID...>

# Login by username and password.
$ xiami-cli login <USERNAME> <PASSWORD>

# Synchronize all favorite songs of a logged user.
$ xiami-cli sync <USERNAME>

# List recommended songs of a logged user.
$ xiami-cli list-recommended <USERNAME>

# List synchronized favorite songs.
$ xiami-cli list-songs

# Cache song resources by songIds.
$ xiami-cli cache <SONG_ID...>
```

## License

MIT.