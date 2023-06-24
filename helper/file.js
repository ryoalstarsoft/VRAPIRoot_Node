/**
 * Created by titu on 10/17/16.
 */

const mkdirp = require('mkdirp');
const path = require('path');
const config = require('../config');
const promise = require('bluebird');
const fs = promise.promisifyAll(require('fs'));
const _ = require('lodash');
const zipHelper = promise.promisifyAll(require('./zip'));
const JSFtp = require("jsftp");
const commonHelper = require('./common');
const babyparse = require('babyparse');
const log = require('./log');

let ensureDirectoryExists = (directory) => {
    return new promise(function (resolve, reject) {
        mkdirp(directory, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });

    });
};

let prepareFiles = (directory) => {
    let allowedZipTypes = config.settings.allowedZipTypes;
    let allowedFileTypes = config.settings.allowedFileTypes;
    let allowedExtensions = _.union(allowedFileTypes, allowedZipTypes);

    return ensureDirectoryExists(directory)
        .then(() => getFiles(directory, allowedExtensions))
        .then((files) => {
            let zippedFiles = files.filter((fileName) => _.includes(allowedZipTypes, _.trimStart(path.extname(fileName), '.')));
            if (!files.length || !zippedFiles.length) {
                return files;
            }
            if (zippedFiles.length) {
                return extractZippedFiles(directory, zippedFiles)
                    .then(() => getFiles(directory, allowedFileTypes));
            }
            else {
                return files;
            }
        });
};

let extractZippedFiles = (directory, zippedFiles) => {
    return promise.map(zippedFiles, function (zipFileName) {
        return zipHelper.unzip(directory, zipFileName);
    });
};

let getFiles = (directory, filterType) => {
    return fs.readdirAsync(directory)
        .filter((fileName) => {
            return fs.statAsync(path.join(directory, fileName))
                .then((stat) => stat.isFile() && _.includes(filterType, _.trimStart(path.extname(fileName), '.')));
        })
};

let getFTPFiles = (dirInfo) => {

    let ftp = null;

    return commonHelper.getUserFTPConfiguration(dirInfo.userName)
        .then((ftpConfig) => {
            if(!ftpConfig) {
                return {
                    error: 'FTP configuration not found for user: ' + dirInfo.userName
                };
            }
            ftp = new JSFtp({
                host: ftpConfig.HostName,
                port: ftpConfig.port || 21,
                user: ftpConfig.UserName, // defaults to "anonymous"
                pass: ftpConfig.Password // defaults to "@anonymous"
            });

            let remoteFile = ftpConfig.RootFolder + '/' + dirInfo.fileName;
            let localDirectory = config.global.userUploadsDir + '/' + dirInfo.userName + '/' + dirInfo.cleanId + '/';
            let localFile = localDirectory + dirInfo.fileName;
            ftp = promise.promisifyAll(ftp);

            if (!commonHelper.isFileCompatible(dirInfo.fileName)) {
                return {
                    error: 'File is not compatible for processing!'
                };
            }
            log.info('Ensuring the directory existence: ', localDirectory);
            return ensureDirectoryExists(localDirectory)
                .then(() => {
                    log.info('Directory existence confirmed.');
                    return ftp.getAsync(remoteFile, localFile)
                        .then( () => {
                            log.info('File fetched completed.');
                            return prepareFiles(localDirectory);
                        }).catch((e) => {
                            log.error('ERROR CATCHED IN ensure directory exist!', e);
                            throw e;
                        })
                })
                .catch((e) => {
                    log.error('ERROR CATCHED ON ensure directory exist!', e);
                    if(e.code && e.code === 550) {
                        return {
                            error: e.message
                        }
                    }
                    else {
                        throw e;
                    }
                })

        })
        .catch((e) => {
            log.error('ERROR CATCHED IN getUserFTPConfiguration call!', e);
            throw e;
        })
};

let saveZipToFTP = (report) => {
    let ftp = null;

    return commonHelper.getUserFTPConfiguration(report.userName)
        .then((ftpConfig) => {
            log.info('writing the zip to ftp');
            ftp = new JSFtp({
                host: ftpConfig.HostName,
                port: ftpConfig.port || 21,
                user: ftpConfig.UserName, // defaults to "anonymous"
                pass: ftpConfig.Password // defaults to "@anonymous"
            });
            let remoteFile = 'clean/' + report.cleanId + '.zip';
            let localDirectory = config.global.userUploadsDir + '/' + report.userName + '/' + report.cleanId + '/';
            let localFile = localDirectory + 'clean/' + report.cleanId + '.zip';

            ftp = promise.promisifyAll(ftp);

            return ftp.putAsync(localFile, remoteFile)
                .catch((e) => {
                    log.error('ERROR CATCHED IN File putAsync!', e);
                    throw e;
                });
        })
        .then( () => {
            return report;
        })
        .catch((e) => {
            log.error('ERROR CATCHED IN REPORT!', e);
            throw e;
        });

};

module.exports = {
    ensureDirectoryExists: ensureDirectoryExists,
    prepareFiles: prepareFiles,
    getFTPFiles: getFTPFiles,
    saveZipToFTP: saveZipToFTP
};
