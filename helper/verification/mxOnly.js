/**
 * Created by titu on 11/7/16.
 */
const commonHelper = require('../common');
const _ = require('lodash');
const promise = require('bluebird');
const dnsCacheRedisHelper = require('../dnsCacheRedis');
const dns = require('dns');
const settings = require('../../config/settings');
const log = require('../log');

let checkEmail = (results, header) => {

    let headerInfo = null;
    let listOfEmails = [];
    let domainsList = [];
    let failedDomains = [];
    let dnsServers = dns.getServers();

    log.info('Found ', dnsServers.length, ' DNS Servers');

    return commonHelper.getWhiteListedDomains()
        .then((whiteListedDomains) => {
            log.info('whitelisteddomains: ', whiteListedDomains.length);
            return promise.map(results, (result) => {
                if (!result || !result.data.length) {
                    return;
                }
                headerInfo = commonHelper.getHeaderInfo(result, header);
                failedDomains = [];
                listOfEmails = commonHelper.getEmailListFromResult(result, headerInfo);

                domainsList = _.chain(listOfEmails)
                    .map(function (email) {
                        if (email.indexOf('@')) {
                            return email.split('@')[1];
                        }
                    })
                    .uniq()
                    .difference(whiteListedDomains).value();

                log.info('need mx check for : ' + domainsList.length + ' domain');
                let checkedMx = 0;
                return promise.map(domainsList, (domain, index) => {
                    if (!domain) {
                        return;
                    }
                    ++checkedMx;
                    if (checkedMx % 1000 === 0) {
                        log.info(checkedMx / 1000 + 'K MX checked.')
                    }
                    return dnsCacheRedisHelper.dnsCache.resolveMxAsync(domain.toString())
                        .then((addresses) => {
                            return true;
                        })
                        .catch((e) => {
                            if (e.code) {
                                switch (e.code) {
                                    case 'ENOTFOUND':
                                    case 'ENODATA':
                                    case 'ESERVFAIL':
                                        failedDomains.push(e.hostname);
                                        break;
                                    case 'ETIMEOUT':
                                        log.info('timeout mx check for : ', domain);
                                        break;
                                    default:
                                        log.info(e.code, ': error for mx check for : ', domain);
                                }
                            }
                            else {
                                log.error('ERROR CATCHED IN MX NESTED 3! ', e);
                                throw e;
                            }
                        });

                }, {concurrency: 4})
                    .then(()=> {
                        let emailsToRemoved = [];
                        result.report.saveReports = result.report.saveReports || [];

                        log.info('MX failed number of domains: ', failedDomains.length);
                        if (failedDomains.length) {
                            _.remove(listOfEmails, function (email) {
                                if (_.includes(failedDomains, email.split('@')[1])) {
                                    if (result.report) {
                                        emailsToRemoved.push(email);
                                        return false;
                                    }
                                    return true;
                                }
                            });

                            emailsToRemoved.forEach(function (email) {
                                if (headerInfo.containsHeader) {
                                    _.remove(result.data, function (d) {
                                        return d[headerInfo.emailColumnHeader] === email;
                                    });
                                }
                                else {
                                    _.remove(result.data, function (d) {
                                        return d[headerInfo.emailIndex] === email;
                                    });
                                }

                            });

                        }
                        log.info('Number of emails found which were in MX failed: ', emailsToRemoved.length);
                        log.info('MXOnly checked completed');
                        result.report.saveReports.push(
                            {
                                reportName: commonHelper.getReportName('mxOnly'),
                                data: emailsToRemoved
                            }
                        );
                    })
                    .catch((e) => {
                        log.error('ERROR CATCHED IN MX NESTED 2! ', e);
                        throw e;
                    });


            })
                .catch((e) => {
                    log.error('ERROR CATCHED IN MX NESTED 1! ', e);
                    throw e;
                });

        })
        .then(()=> results)
        .catch((e) => {
            log.error('ERROR CATCHED IN MX! ', e);
            throw e;
        });
};

module.exports = {
    checkEmail: checkEmail
};
