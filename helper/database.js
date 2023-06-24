/**
 * Created by titu on 11/1/16.
 */

//const mongoose = require('mongoose');
const dbClient = require('mongodb').MongoClient;
const config = require('../config');
const databaseSettings = config.databaseSettings;
const blueBird = require('bluebird');
const log = require('./log');

let initializeDatabase = () => {
    let uriString = databaseSettings.getDatabaseUrl(databaseSettings.getDatabaseConfig());
    let connectionString = 'mongodb://' + uriString;

    return dbClient.connect(connectionString, {
        promiseLibrary: blueBird
    })
        .then((dbClient) => {
            log.info("Mongo client connected successfully with database.");
            module.exports.dbClient = dbClient;
            return;
        })
        .catch((e) => {
            log.error(e);
        });
};

module.exports = {
    initialize: initializeDatabase
};
