/**
 * Created by titu on 10/17/16.
 */

const path = require('path');

module.exports = {
    allowedFileTypes: [
        'txt',
        'xlsm',
        'xlsx',
        'xls',
        'ods',
        'xlt',
        'csv',
        'tsv',
        'text'
    ],
    allowedZipTypes: [
        'zip',
        'rar',
        'tar',
        'gz',
        '7z',
        //'zipx'
        'tgz',
        'tar.gz'
    ],
    allowedEmailLength: 45,
    allowedNumOfDots: 4,
    allowedNumOfAtTheRateOf: 1,
    fuzzyMatchingDomains: [
        'gmail.com',
        'yahoo.com',
        'hotmail.com',
        'msn.com',
        'aol.com',
        'verizon.net'
    ],
    cleanDirectory: 'clean',
    reportMapper: null,
    scrubbingStatus: {
        upload: 'upload',
        syntax: 'syntax',
        validation: 'validation',
        completion: 'completion',
        error: 'error'
    },
    concurrency: 1
};
