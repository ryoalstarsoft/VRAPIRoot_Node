/**
 * Created by titu on 10/17/16.
 */

const _ = require('lodash');

let success = (response, data) => {

    let successResponse = {
        success: true
    };

    if (data) {
        _.extend(successResponse, {
            data: data
        });
    }

    response.status(200).json(successResponse);
};

let failure = (response, err) => {
    let message = [
        'Error in handling this request. ',
        'Please contact system admin.'
    ].join('');
    let status = 500;

    if (typeof err === 'object' && err.status) {
        status = err.status;
    }
    if (typeof err === 'object' && err.message) {
        message = err.message;
    }

    response.status(status).json({
        success: false,
        message: message
    });
};

module.exports = {
    success: success,
    failure: failure
};
