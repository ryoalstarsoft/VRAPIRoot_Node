/**
 * Created by titu on 11/25/16.
 */
const _ = require('lodash');
const dbHelper = require('./database');
const config = require('../config');
const objectID = require('mongodb').ObjectID;
const log = require('./log');

let updateStatus = (cleanId, userName, status, errorMessage) => {

    log.info('updating status for cleanId: ', cleanId, ' with: ', status);
    let now = new Date().getTime();

    let findQuery = {
        cleanId: cleanId,
        userName: userName
    };
    let updateQuery = {
        $set: {
            currentStatus: config.settings.scrubbingStatus[status]
        },
        $push: {
            history: {
                date: now,
                status: config.settings.scrubbingStatus[status]
            }
        }
    };
    let infoQuery = {
        upsert: true,
        multi: false
    };

    if(status === config.settings.scrubbingStatus.error && errorMessage) {
        updateQuery.$set.errorMessage = errorMessage;
    }

    return dbHelper.dbClient.collection('scrub_stats')
        .update(findQuery, updateQuery, infoQuery);

};

let updateSummary = (cleanId, userName, summary) => {

    log.info('updating summary for cleanId: ', cleanId);

    return dbHelper.dbClient.collection('scrub_stats')
        .update(
            {
                cleanId: cleanId,
                userName: userName
            }, {
                $set: {
                    summary: summary
                }
            }, {
                upsert: false,
                multi: false
            });
};

let getStatus = (cleanId) => {

    log.info('retrieving status for cleanId: ', cleanId);

    if (!cleanId) {
        return 'Error! cleanId is not defined.';
    }

    return dbHelper.dbClient.collection('scrub_stats')
        .findOne({cleanId: new objectID(cleanId.toString())})
        .then((scrubStats) => {
            if (scrubStats && scrubStats.currentStatus) {

                let currentStatus = _.find(scrubStats.history, function (history) {
                    return history.status === scrubStats.currentStatus;
                });

                let status = {
                    status: currentStatus.status,
                    updatedOn: currentStatus.date
                };

                if(currentStatus.status === config.settings.scrubbingStatus.completion) {
                    status.summary = scrubStats.summary;
                }
                else if(currentStatus.status === config.settings.scrubbingStatus.error) {
                    status.errorMessage = scrubStats.errorMessage;
                }
                return status;
            }
            else {
                return 'No scrubbing process found with the provided cleanId!';
            }
        });

};

module.exports = {
    updateStatus: updateStatus,
    updateSummary: updateSummary,
    getStatus: getStatus
};
