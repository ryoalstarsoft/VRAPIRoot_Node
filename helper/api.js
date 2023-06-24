/**
 * Created by titu on 11/25/16.
 */

const statusHelper = require('./status');
const config = require('../config');
const settingsConfig = config.settings;
const messageConfig = config.message;
const fileHelper = require('./file');
const responseHelper = require('./response');
const commonHelper = require('./common');
const validationHelper = require('./validation');
const reportHelper = require('./report');
const _ = require('lodash');


let getFTPFiles = (dirInfo, response) => {
    return statusHelper.updateStatus(dirInfo.cleanId, dirInfo.userName, settingsConfig.scrubbingStatus.upload)
        .then(() => {
            return fileHelper.getFTPFiles(dirInfo);
        });
};

let validateFiles = (dirInfo, files, steps) => {
    if (files.error) {
        statusHelper.updateStatus(dirInfo.cleanId, dirInfo.userName, settingsConfig.scrubbingStatus.error, files.error);
        steps.cancel();
        return;
    }
    else if (_.isEmpty(files)) {
        statusHelper.updateStatus(dirInfo.cleanId, dirInfo.userName, settingsConfig.scrubbingStatus.error, messageConfig.files_not_found_error);
        steps.cancel();
        return;
    }
    return files;
};

let loadReportMapper = (dirInfo, files) => {
    return statusHelper.updateStatus(dirInfo.cleanId, dirInfo.userName, settingsConfig.scrubbingStatus.syntax)
        .then(()=> {
            return commonHelper.getReportMapper()
                .then((reportMapper) => {
                    config.settings.reportMapper = reportMapper;
                    return files;
                });
        });
};

let startValidation = (directory, files, header, scrubOptions, dirInfo) => {
    return statusHelper.updateStatus(dirInfo.cleanId, dirInfo.userName, settingsConfig.scrubbingStatus.validation)
        .then(() => {
            return validationHelper.start(directory, files, header, scrubOptions);
        });
};

let saveReports = (results, report, directory, time, header) => {
    report.endTime = new Date().getTime();
    report.totalRecordsAfterClean = 0;
    report.totalPreCleanRecords = 0;
    report.files = [];

    results.forEach((result) => {
        if (!result) {
            return;
        }
        report.totalRecordsAfterClean += result.data.length;
        report.totalPreCleanRecords += result.report.totalRecords;
        if (result.report) {
            report.files.push({
                fileName: result.report.fileName,
                reports: result.report.saveReports,
                totalRecords: result.report.totalRecords,
                data: result.data
            });
        }
    });

    report.timeRequired = time.end('clean');
    return reportHelper.saveReports(report, directory, header);
};

let sendResponse = (finalReport, response, dirInfo) => {
    finalReport.files.forEach(function (file) {
        delete file.data;
        file.reports.forEach(function (fileReport) {
            fileReport.numOfRecords = fileReport.data.length;
            delete fileReport.data;
        });
    });
    return statusHelper.updateStatus(dirInfo.cleanId, dirInfo.userName, config.settings.scrubbingStatus.completion)
        .then(() => {
            statusHelper.updateSummary(dirInfo.cleanId, dirInfo.userName, finalReport);
        });
    /*.then(()=> {
     responseHelper.success(response, {
     summary: finalReport
     });
     })*/
};

let getStatus = (cleanId) => {
    return statusHelper.getStatus(cleanId);
};

let saveUserRequest = (dirInfo, header, scrubOptions, timeRequested) => {
    var userRequest = _.extend({}, dirInfo, {
        'timeRequested': timeRequested
    }, {
        'header': header
    }, {
        'scrubOptions': scrubOptions
    });

    return commonHelper.saveUserRequest(userRequest);
};

module.exports = {
    getFTPFiles: getFTPFiles,
    validateFiles: validateFiles,
    loadReportMapper: loadReportMapper,
    startValidation: startValidation,
    saveReports: saveReports,
    sendResponse: sendResponse,
    getStatus: getStatus,
    saveUserRequest: saveUserRequest
};
