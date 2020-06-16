var _ = require('lodash');
var spawn = require('child-process-promise').spawn;
var promisePipe = require('promisepipe');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require("fs"));
var tempFile = require('tempfile');
var svg2png = require('svg2png');
var cheerio = require('cheerio');

var convertToArguments = function(options) {
	if (options) {
		return _.flatMapDeep(options, (val, key) => val ? ['--' + key, val] : ['--' + key]);
	}
	return [];
};

class RequestExecutor {

	constructor(webResponse, options) {
		this.error = '';
		this.response = webResponse;
		//prepare arguments
		this.args = convertToArguments(options);
	}

	createPdfResponse(pdfPath) {
		this.response.setHeader('Content-type', 'application/pdf');
		return promisePipe(fs.createReadStream(pdfPath), this.response);
	}

	createPdfWithWarning(pdfPath) {
		this.response.setHeader('Warning', '199 - Pdf generated with warnings, see pdf logs with filter on requestId');
		return this.createPdfResponse(pdfPath);
	}

	createBadRequest() {
		return this.response.status(400).send('Invalid arguments: ' + this.error);
	}

	generatePdf(header, body, footer) {

		let pdfFile = tempFile('.pdf');
		let tempFiles = [pdfFile, body];

		return Promise.resolve()
			.then(() => {
				//for cleaning purposes

				if (footer){
					tempFiles.push(footer);
					this.args.push('--footer-html', footer)
				}
				if (header){
					tempFiles.push(header);
					this.args.push('--header-html', header)
				}

				console.log(this.args.concat(body, pdfFile))

				return this.args.concat(body, pdfFile);
				})
			.then((params) =>
				spawn('wkhtmltopdf', params, { capture:['stdout', 'stderr'] }))
			.then(result => {
				// everything ok
				return this.createPdfResponse(pdfFile);
			// if something happened
			}).catch(err => {
				//extract error message
				this.error = '[spawn]: ' + err.toString();
				if (err.stderr) {
					this.error += '\r\n[stderr]:' + err.stderr.toString();
				}

				//sometimes the error is recoverable
				if (fs.existsSync(pdfFile) && fs.statSync(pdfFile).size > 0) {
					return this.createPdfWithWarning(pdfFile)
				}

				return this.createBadRequest();
			//remove temporary files
			}).then(() => Promise.all(_.map(tempFiles, file => fs.unlinkAsync(file)))
				.catch(err => this.error += err)
			);
	}
}

//main handler
class RequestHandler {

	constructor(loggerToUse) {
		this.logger = loggerToUse;

		this.pngScale = process.env.SVGTOPNGSCALE || 2;
	}

	//writes base64 string into binary file
	writeBase64(base64) {
		if (base64) {
			let fileContent = new Buffer.from(base64, 'base64').toString('utf8');
			let tmpFile = tempFile('.html');

			const $ = cheerio.load(fileContent, { decodeEntities: false });

			let svgs = Array.from($('svg'));

			return Promise.map(svgs, (svgElement) => {

				let svg = $(svgElement);

				let svgWidth = svg.attr('width');
				let svgHeight = svg.attr('height');

				svg.removeAttr('width');
				svg.removeAttr('height');

				svg.attr('viewBox', '0 0 ' + svgWidth + ' ' + svgHeight);

				//shrink down the text, as there's an issue with dpi
				let texts = svg.find("text").each((i, element) => {

					let text = $(element);
					let fontSize = text.css("font-size");

					// taking 2 last characters
					if (fontSize.length > 2){
						//cutting them
						let units = fontSize.length - 2;
						let lastChars = fontSize.substr(units);
						if (lastChars === 'px' || lastChars === 'pt'){
							let size = fontSize.substr(0, units);
							// to 72 dpi
							let newSize = size / 96 * 72;
							text.css("font-size", newSize + lastChars);
						}
					}
				});

				let svgString = $.html(svg).replace(new RegExp('font-family:.+?;', 'g'), "font-family: 'Open Sans', sans-serif;");

				let svgBuffer = new Buffer.from(svgString, 'utf8');
				let scaling = this.pngScale;

				return svg2png(svgBuffer, { width : svgWidth * scaling, height : svgHeight * scaling }).then((pngBuffer) => {
					let pngBase64 = pngBuffer.toString('base64');
					let image = $("<img/>");
					image.attr('src', 'data:image/png;base64,' + pngBase64);
					image.attr('width', svgWidth);
					image.attr('height', svgHeight);
					svg.replaceWith(image);
				});
			}, {concurrency: 4 })
			.then(() => fs.writeFileAsync(tmpFile, $.html()))
			.then(() => tmpFile)
			.catch(err => this.logger.error(err));
		}
	}

	process(request, response) {
		let body = request.body;
		let executor = new RequestExecutor(response, body.options);

		console.log(body)

		let writeBase64 = this.writeBase64.bind(this);

		return Promise.join(writeBase64(body.header), writeBase64(body.body),  writeBase64(body.footer), executor.generatePdf.bind(executor))
			.finally(() => {
				// log everything if anything goes wrong
				let message = 'Request served: '  + (body.requestId || '(no request id specified)');
				let error = executor.error;
				if (error){
					message += '\r\n' + error;
					this.logger.error(message);
				} else {
					this.logger.info(message);
				}
			});
	}
}

module.exports = RequestHandler;
