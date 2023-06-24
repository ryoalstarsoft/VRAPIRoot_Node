/**
 * Created by titu on 10/17/16.
 */

const startApi = require('../api/start');

let initializeRouter = (app) => {
    startApi.init(app);
    app.get('/', (request, response) => {
        response.send('<h2>Welcome to VerifyRocket REST API</h2>');
    });
    app.use((request, response) => {
        response.status(404).send('Requested service not found');
    });
};

module.exports = initializeRouter;