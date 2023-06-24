/**
 * Created by titu on 10/24/16.
 */
const promise = require('bluebird');
const fs = require('fs');
const csv = require('fast-csv');
const _ = require('lodash');
const babyparse = require('babyparse');
const globalConfig = require('../../config/global');
const log = require('../log');

let readFromFileAndRemoveDupes = (filePath, header, scrubOptions) => {
    log.info('readFromFileAndRemoveDupes: CSV');
    let containsHeader = false;

    return new promise((resolve, reject) => {

        if (_.isObject(header) && header.header === true) {
            containsHeader = true;
        }
        log.info('MEMORY USE BEFORE FILE READ: ', process.memoryUsage());
        babyparse.parseFiles(filePath, {
            header: containsHeader,
            complete: (results) => {
                resolve(onParseComplete(results, header, scrubOptions.duplicates));
            },
            error: (err, file, inputElem, reason) => {
                reject(err);
            },
        });

    });
};

let onParseComplete = (results, header, scrubDuplicate) => {
    let csvData = {};
    let uniqueData = [];
    let containsHeader = false;
    let emailIndex = header.emailIndex || 0;
    let emailColumnHeader = null;
    let email = null;
    let duplicateData = [];

    if (_.isObject(header) && header.header === true) {
        containsHeader = true;
    }

    if (results.data && results.data.length) {

        /*
         Detect that if the data is in form of object or in array

         if in Object then that is a key/value pair and confirms
         to be a file parsed having header.

         if in Array then a file which doesn't have header
         */

        log.info('MEMORY USE: ', process.memoryUsage());
        if (containsHeader) { // So there is a header
            //determine the email field name/column header for email
            for (let key in results.data[0]) {
                if (_.includes(globalConfig.emailKeyNames, key.toLowerCase())) {
                    emailColumnHeader = key;
                    break;
                }
            }
            results.data = _.remove(results.data, function (record) {
                return !!record[emailColumnHeader];
            });
            results.data.forEach(function (record) {
                email = record[emailColumnHeader];

                if (email) {
                    record[emailColumnHeader] = email = _.toLower(email);
                    if (scrubDuplicate) {
                        if (!csvData[email]) {
                            csvData[email] = true;
                            uniqueData.push(record);
                        }
                        else {
                            duplicateData.push(email);
                        }
                    }
                }
            });
        }
        else { // No header provided
            results.data = _.remove(results.data, function (record) {
                return !!record[emailIndex];
            });
            results.data.forEach(function (record) {
                email = record[emailIndex];

                if (record.length && email) {
                    record[emailIndex] = email = _.toLower(email);
                    if (scrubDuplicate) {
                        if (!csvData[email]) {
                            csvData[email] = true;
                            uniqueData.push(record);
                        }
                        else {
                            duplicateData.push(email);
                        }
                    }
                }
            });
        }

        let report = {
            'totalRecords': results.data.length,
            'duplicate': (results.data.length - uniqueData.length),
            saveReports: []
        };

        if (scrubDuplicate) {
            report.saveReports.push({
                reportName: require('../common').getReportName('duplicates'),
                data: duplicateData
            })
        }

        return {
            data: scrubDuplicate ? uniqueData : results.data,
            delimiter: results.data.delimiter,
            report: report
        };
    }
    else {
        return [];
    }
};


let save = (data, filePath, fileName, header, delimiter) => {
    return new promise(function (resolve, reject) {
        let writeStream = fs.createWriteStream(filePath + '/' + fileName + '.csv');
        let containsHeader = false;

        if (_.isObject(header) && header.header === true) {
            containsHeader = true;
        }
        writeStream.on('error', reject);
        writeStream.on('finish', function () {
            resolve();
        });
        csv.write(data, {
            headers: containsHeader,
            delimiter: delimiter
        }).pipe(writeStream);
    });
};

let parseFiles = function ParseFiles(_input, _config) {
    if (Array.isArray(_input)) {
        let results = [];
        _input.forEach(function (input) {
            if (typeof input === 'object')
                results.push(ParseFiles(input.file, input.config));
            else
                results.push(ParseFiles(input, _config));
        });
        return results;
    } else {
        let results = {
            data: [],
            errors: []
        };
        if ((/(\.csv|\.txt|\.tsv|\.text)$/).test(_input)) {
            try {
                /*let contents = fs.readFileSync(_input).toString();
                 return this.parse(contents, _config);*/
                let me = this;

                fs.readFile(_input, 'UTF-8', function (err, contents) {
                    if (err) {
                        log.error(err);
                        results.errors.push(err);
                        return results;
                    }
                    else {
                        log.info('file contents read completed within CSV handler');
                        me.parse(contents, _config);
                    }

                });
            } catch (err) {
                results.errors.push(err);
                return results;
            }
        } else {
            results.errors.push({
                type: '',
                code: '',
                message: 'Unsupported file type.',
                row: ''
            });
            return results;
        }
    }
};
parseFiles.bind(babyparse);
babyparse.parseFiles = parseFiles;

module.exports = {
    readFromFileAndRemoveDupes: readFromFileAndRemoveDupes,
    onParseComplete: onParseComplete,
    save: save
};
