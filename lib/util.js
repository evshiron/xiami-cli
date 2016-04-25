
'use strict';

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

module.exports = {

    DecodeLocation: DecodeLocation,

};
