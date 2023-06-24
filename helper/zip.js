/**
 * Created by titu on 10/18/16.
 */

const _ = require('lodash');
const promise = require('bluebird');
const child_process = promise.promisifyAll(require('child_process'));

let zip = (directory, zipFileName, format, next) => {
    //7z a -ttar -so archive.tar * | 7z a -si archive.tgz
    let command = buildCommand(format, true, directory, zipFileName + '.zip');

    /*child_process.exec(command, (err) => {
        nextHandler(err, next)
    });*/
    return child_process.execAsync(command);

};

let unzip = (directory, zipFileName) => {
    let command = buildCommand(null, false, directory, zipFileName);
    return child_process.execAsync(command)
};

let nextHandler = (err, next) => {
    if (err) {
        next(err);
        return;
    }
    next(null);
};

let buildCommand = (format, doZip, directory, zipFileName) => {
    let command = '7z ';

    let nameWithoutExtension = (fileName) => {

        if (_.endsWith(zipFileName, 'tar.gz')) {
            return _.trimEnd(fileName, '.tar.gz');
        }
        else if (_.endsWith(zipFileName, 'tgz')) {
            return _.trimEnd(fileName, '.tgz');
        }
        else if (_.endsWith(s, 'gz')) {
            return _.trimEnd(fileName, '.gz');
        }
        else {
            return _.trimEnd(fileName, '.' + fileName.split('.')[fileName.split('.').length - 1]);
        }
    };

    if (_.isNil(doZip) || doZip) {
        command += 'a ' + (format ? ('-t' + format + ' ') : '-tzip ');
        command += directory + '/' + zipFileName + ' ' + directory + '/*';
    }
    else {

        if (_.endsWith(zipFileName, 'gz')) {
            command += 'e ';
            command += directory +
                '/' +
                zipFileName +
                ' -o' +
                directory +
                ' -aoa' +
                ' && 7z e ' +
                directory +
                '/' +
                nameWithoutExtension(zipFileName) +
                '.tar' +
                ' -o' +
                directory +
                ' -aoa';
        }
        else {
            command += 'e ';
            command += directory + '/' + zipFileName + ' -o' + directory +
                ' -aoa';
        }

    }

    return command;
};

module.exports = {
    zip: zip,
    unzip: unzip
};