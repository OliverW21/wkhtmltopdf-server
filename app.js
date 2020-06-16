var status = require('express-status-monitor');
var health = require('express-healthcheck');
var bodyParser = require('body-parser');
var express = require('express');
var log = require('./log.js');
var RequestHandler = require('./requestHandler.js')
var app = express();

app.use('/uptime', health());
app.use(status());
//default html doc
app.use(express.static('docs'));

//increase body size limit
app.use(bodyParser.json({
  limit: '100mb'
}));

var logger = log.getLogger();
app.use(log.connectLogger(logger, { level: 'auto' }));

logger.setLevel('info');
logger.info("PDF Service is starting...");

var requestHandler = new RequestHandler(logger);

//register handler
app.post('/', bodyParser.json(), requestHandler.process.bind(requestHandler));

app.listen(process.env.PORT || 5580);

module.exports = app;
