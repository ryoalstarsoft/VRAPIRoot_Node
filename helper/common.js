/**
 * Created by titu on 11/2/16.
 */
const _ = require('lodash');
const dbHelper = require('./database');
const global = require('../config/global');
const csvHandler = require('./validation/csv');
const xlxHandler = require('./validation/xlx');
const config = require('../config');
const dns = require('dns');
const log = require('./log');

let getEmailParts = (email) => {

    //let match = /(.*)@+([^.]*\.{1}\w+)((\.{1}\w+))*/g.exec(email);
    let match = /(.*)@+([^.]*\.{1}[^\..]*)((\.{1}[^\..]*))*/g.exec(email);
    if (_.isNil(match)) {
        log.info('problem in breaking the email into parts: ' + email);
        return {
            user: null,
            domain: null,
            endings: null
        };
    }

    return {
        user: match[1],
        domain: match[2],
        endings: match[4]
    };

};

let getWhiteListedDomains = () => {
    return dbHelper.dbClient.collection('whitelisted_domains')
        .find({})
        .toArray()
        .then((domains) => {
            return _.map(domains, 'domain');
        });
};

let getDNSServers = () => {
    return dbHelper.dbClient.collection('dns_servers')
        .find({})
        .toArray()
        .then((servers) => {
            return _.map(servers, 'server');
        });
};

let getUserFTPConfiguration = (userName) => {
    return dbHelper.dbClient.collection('client_ftpmaster')
        .findOne({UserName: userName})
        .then((userFTPConfig) => {
            return userFTPConfig;
        });
};

let getReportMapper = () => {
    return dbHelper.dbClient.collection('report_mapper')
        .find({})
        .toArray()
        .then((reportNames) => {
            return reportNames;
        });
};

let saveUserRequest = (userRequest) => {
    return dbHelper.dbClient.collection('user_scrub_requests')
        .insert(userRequest);
};

let getReportConfig = (keyName) => {
    let matchedReportConfig = null;

    let reportOb =  _.find(config.settings.reportMapper, {keyName: keyName});
    if(!reportOb || !reportOb.reportName) {
        matchedReportConfig = {
            reportName: keyName,
            keyName: keyName,
            paramName: null
        };
    }
    else {
        matchedReportConfig = reportOb
    }
    return matchedReportConfig;
};

let getReportName = (keyName) => {
    return getReportConfig(keyName).reportName;
};

let getHeaderInfo = (result, header) => {
    let containsHeader = false;
    let emailIndex = header.emailIndex || 0;
    let emailColumnHeader = null;

    if (_.isObject(header) && header.header === true) {
        containsHeader = true;
    }
    if (containsHeader) {
        for (let key in result.data[0]) {
            if (_.includes(global.emailKeyNames, key.toLowerCase())) {
                emailColumnHeader = key;
                break;
            }
        }
    }
    return {
        emailIndex: emailIndex,
        emailColumnHeader: emailColumnHeader,
        containsHeader: containsHeader
    };
};

let getEmailListFromResult = (result, headerInfo) => {
    if (headerInfo.containsHeader) {
        return _.map(result.data, headerInfo.emailColumnHeader);
    }
    return _.map(result.data, function (record) {
        return record[headerInfo.emailIndex];
    });
};

let getFileExtension = (fileName) => {
    return fileName.split('.').pop();
};

let geFileHandler = (fileExtension) => {

    let handler = null;

    switch (fileExtension) {
        case 'txt':
        case 'csv':
        case 'tsv':
        case 'text':
            handler = csvHandler;
            break;
        case 'xlsm':
        case 'xlsx':
        case 'xls':
        case 'ods':
        case 'xlt':
            handler = xlxHandler;
            break;
    }
    return handler;
};

let isFileCompatible = (fileName) => {
    let allowedTypes = _.concat(config.settings.allowedFileTypes, config.settings.allowedZipTypes);
    return _.includes(allowedTypes, getFileExtension(fileName));
};

let setDNSServers = () => {
    return getDNSServers().then((servers) => {
        dns.setServers(servers);
        log.info('dnsServers found: ', servers.length);
        return;
    });
};

module.exports = {
    getEmailParts: getEmailParts,
    getWhiteListedDomains: getWhiteListedDomains,
    getHeaderInfo: getHeaderInfo,
    getEmailListFromResult: getEmailListFromResult,
    getFileExtension: getFileExtension,
    geFileHandler: geFileHandler,
    isFileCompatible: isFileCompatible,
    getUserFTPConfiguration: getUserFTPConfiguration,
    getReportMapper: getReportMapper,
    getReportName: getReportName,
    getReportConfig: getReportConfig,
    getDNSServers: getDNSServers,
    saveUserRequest: saveUserRequest,
    setDNSServers: setDNSServers
};
