/**
 * Created by titu on 11/1/16.
 */
const staticListEmailsRemover = require('./emails');
const staticListDomainsRemover = require('./domains');
const staticListEndingsRemover = require('./endings');
const staticListBadWords = require('./words');
const staticListRoles = require('./role');
const log = require('../../log');


let start = (result, header, scrubOptions) => {
    log.info('starting with staticListEmailsRemover...');
    return staticListEmailsRemover.remove (result, header, scrubOptions)
        .then((result) => {
            log.info('starting with staticListDomainsRemover...');
            return staticListDomainsRemover.remove(result, header, scrubOptions);
        })
        .then((result) => {
            log.info('starting with staticListEndingsRemover...');
            return staticListEndingsRemover.remove(result, header, scrubOptions);
        })
        .then((result) => {
            log.info('starting with staticListBadWords...');
            return staticListBadWords.remove(result, header, scrubOptions);
        })
        .then((result) => {
            log.info('starting with staticListRoles...');
            return staticListRoles.remove(result, header, scrubOptions);
        });
};

let search = (result) => {
    return staticListEmailsRemover.search (result)
        .then((result) => {
            if(result && result.failed) {
                return result;
            }
            return staticListDomainsRemover.search(result);
        })
        .then((result) => {
            if(result && result.failed) {
                return result;
            }
            return staticListEndingsRemover.search(result);
        })
        .then((result) => {
            if(result && result.failed) {
                return result;
            }
            return staticListBadWords.search(result);
        })
        .then((result) => {
            if(result && result.failed) {
                return result;
            }
            return staticListRoles.search(result);
        });
};

module.exports = {
    start: start,
    search: search
};
