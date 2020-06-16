var log4js = require('log4js');

var logAppenders = [
	{ type: 'console' }
]

if (process.env.LOGSTASHHOST && process.env.LOGSTASHPORT){
	logAppenders.push({
		type: "log4js-logstash",
		host: process.env.LOGSTASHHOST,
		port: +process.env.LOGSTASHPORT // convert to number, important for logstash appender
	})
}

log4js.configure({
	appenders: logAppenders
});

module.exports = log4js;