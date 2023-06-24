/**
 * Created by titu on 12/5/16.
 */
const redis = require('redis');
const promise = require('bluebird');
const log = require('./log');

promise.promisifyAll(redis.RedisClient.prototype);
promise.promisifyAll(redis.Multi.prototype);

let initializeRedis = () => {
    let client = redis.createClient();

    return new promise(function (resolve, reject) {
        client.on('connect', function () {
            module.exports.redisClient = client;
            log.info('Redis connected successfully.');
            resolve(client);
        });

        client.on('error', function (error) {
            log.error('Error in connecting with Redis: ', error);
            reject(error);
        });
    })
        .catch((e) => {
            log.error(e);
        });
};

module.exports = {
    initialize: initializeRedis,
};
