/**
 * Created by titu on 12/7/16.
 */
const log = require('../helper').log;

let logErrors = (error, request, response, next) => {
    log.error(
        'Error in handling request'
        , { originalUrl: request.originalUrl }
        , { originalMethod: request.originalMethod }
        , { error: error }
    );
    next(error);
};

let handleErrors = (error, request, response, next) => {
    response.status(500).json({
        success: false,
        message: [
            'Error in handling this request. ',
            'Please contact system admin if you are continuously seeing this message.'
        ].join('')
    });
};

module.exports = {
    log: logErrors,
    handle: handleErrors
};
