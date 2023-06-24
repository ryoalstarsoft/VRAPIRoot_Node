/**
 * Created by titu on 10/20/16.
 */

const promise = require('bluebird');
const fs = require('fs');
const csv = require('fast-csv');
const fileHelper = require('./file');
const _ = require('lodash');
const parse = require('csv-parse');

let startValidation = (directory, files) => {
    return promise.map(files, function (file) {
        return readFileAndRemoveDuplicates(directory, file);
    })
};

let readFileAndRemoveDuplicates = (directory, fileName) => {

    let filePath = directory + '/' + fileName;
    let uniqueDirectory = directory + '/unique/';
    let uniqueFilePath = uniqueDirectory + fileName;
    return fileHelper.ensureDirectoryExists(uniqueDirectory)
        .then(() => readFromFile(filePath))
        .then(makeLowerCaseAndRemoveDuplicates)
        .then((uniqueData) => {
            return writeToFile(uniqueData, uniqueFilePath);
        });
};

let readFromFile = (filePath) => {
    let readStream = fs.createReadStream(filePath);

    return new promise((resolve, reject) => {

        readStream.on("error", reject);

        let parser = parse({delimiter: ','}, (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(data);
            }

        });

        readStream.pipe(parser);
    });
};

let writeToFile = (uniqueData, uniqueFilePath) => {
    return new promise(function (resolve, reject) {
        let writeStream = fs.createWriteStream(uniqueFilePath);
        writeStream.on('error', reject);
        writeStream.on('finish', resolve);
        csv.write(uniqueData, {headers: true}).pipe(writeStream);
    });
};

let makeLowerCaseAndRemoveDuplicates = (data) => {
    let csvData = {};
    let uniqueData = [];

    if (data && data.length) {
        data.forEach(function (record) {
            if (_.isArray(record) && record.length && !csvData[record[0]]) {
                record[0] = _.toLower(record[0]);
                csvData[record[0]] = record;
            }
        });

        for (var key in csvData) {
            if (csvData.hasOwnProperty(key)) {
                uniqueData.push(csvData[key]);
            }
        }

        return uniqueData;
    }
    else {
        return [];
    }
};

module.exports = {
    start: startValidation
};