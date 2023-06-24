/**
 * Created by titu on 12/7/16.
 */
const log = require('../helper').log;

let logRequests = (request, response, next) => {
    log.info({
        url: request.originalUrl,
        method: request.method,
        params: request.params,
        query: request.query,
        body: request.body
    }, 'Request');

    next();
};

module.exports = {
    log: logRequests
};
