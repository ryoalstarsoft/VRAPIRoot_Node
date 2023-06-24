/**
 * Created by titu on 11/7/16.
 */

const mxOnlyHandler = require('./mxOnly');
const mxStandardHandler = require('./mxStandard');
const promise = require('bluebird');
const log = require('../log');

let start = (results, header, scrubOptions) => {
    return new promise(function (resolve, reject) {
        resolve();
    })
        .then(() => {
            return startMXOnly(results, header, scrubOptions)
        })

        .then(() => {
            return startMXStandard(results, header, scrubOptions);
        });
};

let startMXOnly = (results, header, scrubOptions) => {

    if (scrubOptions.mxOnly) {
        log.info('# Starting with mxOnlyHandler.checkEmail...');
        return mxOnlyHandler.checkEmail(results, header);
    }
    else {
        return results;
    }
};

let startMXStandard = (results, header, scrubOptions) => {
    if (scrubOptions.mxStandard) {
        log.info('# Starting with mxStandardHandler.checkEmail...');
        return mxStandardHandler.checkEmail(results, header);
    }
    else {
        return results;
    }
};

module.exports = {
    start: start
};
