/**
 * Created by titu on 11/7/16.
 */
const commonHelper = require('../common');
const _ = require('lodash');
const promise = require('bluebird');
const dns = promise.promisifyAll(require("dns"));
const settings = require('../../config/settings');

let checkEmail = (results, header) => {

    let headerInfo = null;
    let listOfEmails = [];
    let domainsList = [];
    let failedDomains = [];
    let dnsServers = dns.getServers();

    console.log('Found ', dnsServers.length, ' DNS Servers');

    return commonHelper.getWhiteListedDomains()
        .then((whiteListedDomains) => {
            console.log('whitelisteddomains: ', whiteListedDomains.length);
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

                console.log('need mx check for : ' + domainsList.length + ' domain');
                var checkedMx = 0;
                return promise.map(domainsList, (domain, index) => {
                    if (!domain) {
                        return;
                    }
                    ++checkedMx;
                    if(checkedMx%1000 === 0) {
                        console.log(checkedMx/1000 + 'K MX checked.')
                    }
                    return dns.resolveMxAsync(domain.toString())
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
                                        console.log('timeout mx check for : ', domain);
                                        break;
                                    default:
                                        console.log(e.code, ': error for mx check for : ', domain);
                                }
                            }
                            else {
                                console.log('ERROR CATCHED IN MX NESTED 3!');
                                console.log(e);
                                throw e;
                            }
                        });

                }, {concurrency: dnsServers.length})
                    .then(()=> {
                        var emailsToRemoved = [];
                        result.report.saveReports = result.report.saveReports || [];

                        console.log('MX failed number of domains: ', failedDomains.length);
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
                        console.log('Number of emails found which were in MX failed: ', emailsToRemoved.length);
                        result.report.saveReports.push(
                            {
                                reportName: commonHelper.getReportName('mxOnly'),
                                data: emailsToRemoved
                            }
                        );
                    })
                    .catch((e) => {
                        console.log('ERROR CATCHED IN MX NESTED 2!');
                        console.log(e);
                        throw e;
                    });


            })
                .catch((e) => {
                    console.log('ERROR CATCHED IN MX NESTED 1!');
                    console.log(e);
                    throw e;
                });

        })
        .then(()=> results)
        .catch((e) => {
            console.log('ERROR CATCHED IN MX!');
            console.log(e);
            throw e;
        });
};

module.exports = {
    checkEmail: checkEmail
};
