/**
 * Created by titu on 11/4/16.
 */
/**
 * Created by titu on 11/1/16.
 */
const dbHelper = require('../../database');
const _ = require('lodash');
const promise = require('bluebird');
const global = require('../../../config/global');
const commonHelper = require('../../common');
const collection = 'static_list_roles';
const log = require('../../log');

let remove = (results, header, scrubOptions) => {

    let dbClient = dbHelper.dbClient;
    let containsHeader = false;
    let emailIndex = header.emailIndex || 0;
    let emailColumnHeader = null;
    let listOfEmails = [];
    let emailsToRemoved = [];

    if (_.isObject(header) && header.header === true) {
        containsHeader = true;
    }

    return promise.map(results, (result) => {
        listOfEmails = [];
        if (!result || !result.data.length) {
            return;
        }

        let reportConfig = commonHelper.getReportConfig(collection);

        if(!scrubOptions[reportConfig.paramName]) {
            return;
        }

        if (containsHeader) {
            for (let key in result.data[0]) {
                if (_.includes(global.emailKeyNames, key.toLowerCase())) {
                    emailColumnHeader = key;
                    break;
                }
            }
            listOfEmails = _.map(result.data, emailColumnHeader);
        }
        else {
            listOfEmails = _.map(result.data, function (record) {
                return record[emailIndex];
            });
        }
        return new promise(function (resolve, reject) {
            dbClient.collection(collection).find({}, {role: 1, _id: 0})
                .toArray(function (err, roles) {
                    if (err) {
                        reject(err)
                    }
                    resolve(roles);
                })
        })
            .then(function (roles) {
                emailsToRemoved = [];
                roles = _.map(roles, 'role');

                roles.forEach(function (role) {
                    if (containsHeader) {
                        _.remove(result.data, function (d) {
                            if (commonHelper.getEmailParts(d[emailColumnHeader]).user === role) {
                                emailsToRemoved.push(d[emailColumnHeader]);
                                return true;
                            }
                            return false;
                        });
                    }
                    else {
                        _.remove(result.data, function (d) {
                            if (commonHelper.getEmailParts(d[emailIndex]).user === role) {
                                emailsToRemoved.push(d[emailIndex]);
                                return true;
                            }
                            return false;
                        });
                    }
                });
                result.report.saveReports = result.report.saveReports || [];
                result.report.saveReports.push({
                    reportName: commonHelper.getReportName(collection),
                    data: emailsToRemoved
                });

                return;
            })
            .catch((e) => {
                log.error('ERROR CATCHED IN ROLES NESTED 1! ', e);
                throw e;
            });
    })
        .then(()=> results)
        .catch((e) => {
            log.error('ERROR CATCHED IN ROLES! ', e);
            throw e;
        });

};

let search = (result) => {

    let dbClient = dbHelper.dbClient;

    return new promise(function (resolve, reject) {
        dbClient.collection(collection).find({}, {role: 1, _id: 0})
            .toArray(function (err, roles) {
                if (err) {
                    reject(err);
                }
                else {
                    _.each(roles, function (role) {
                        if (role.role && commonHelper.getEmailParts(result.email).user.toLowerCase() === role.role.toLowerCase()) {
                            result.report[collection] = role.role;
                            result.failed = true;
                            return false;
                        }
                    });
                    resolve(result);
                }
            });
    })
        .then(()=> result);

};

module.exports = {
    remove: remove,
    search: search
};
