/**
 * Created by titu on 10/17/16.
 */

const globalConfig = require('./global');
const settingsConfig = require('./settings');
const databaseConfig = require('./database');
const messageConfig = require('./message');

module.exports = {
    global: globalConfig,
    settings: settingsConfig,
    message: messageConfig,
    databaseSettings: databaseConfig
};